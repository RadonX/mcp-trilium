import { jest } from '@jest/globals';
import { updateNote } from '../src/tools/update-note.js';
import { ValidationError } from '../src/utils/validation.js';
import { TriliumAPIError } from '../src/utils/trilium-client.js';

// Mock the logger to avoid console output during tests
jest.mock('../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  }
}));

describe('updateNote', () => {
  let mockClient;

  // Mock note data
  const mockNote = {
    noteId: "note123abc",
    title: "JavaScript Fundamentals",
    type: "text",
    mime: "text/html",
    isProtected: false,
    isDeleted: false,
    dateCreated: "2024-01-15T10:30:00.000Z",
    dateModified: "2024-01-15T14:45:00.000Z",
    utcDateCreated: "2024-01-15T10:30:00.000Z",
    utcDateModified: "2024-01-15T14:45:00.000Z",
    parentNoteId: "root",
    contentLength: 1250
  };

  const mockCodeNote = {
    ...mockNote,
    noteId: "note456def",
    title: "React Components Guide",
    type: "code",
    mime: "text/x-javascript"
  };

  beforeEach(() => {
    // Reset mock client before each test
    mockClient = {
      get: jest.fn(),
      put: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('Successful updates', () => {
    test('should update note content successfully', async () => {
      // Arrange
      const noteId = 'note123abc';
      const content = 'Updated content for the note';
      const existingNote = mockNote;
      const updatedNote = {
        ...existingNote,
        dateModified: '2024-01-25T15:30:00.000Z'
      };

      mockClient.get.mockResolvedValueOnce(existingNote); // Note exists check
      mockClient.put.mockResolvedValueOnce({}); // Content update
      mockClient.get.mockResolvedValueOnce(updatedNote); // Updated note info

      // Act
      const result = await updateNote(mockClient, { noteId, content });

      // Assert
      expect(mockClient.get).toHaveBeenCalledWith(`notes/${noteId}`);
      expect(mockClient.put).toHaveBeenCalledWith(`notes/${noteId}/content`, { content });
      expect(mockClient.get).toHaveBeenCalledWith(`notes/${noteId}`);
      
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Note updated: "JavaScript Fundamentals"');
      expect(result.content[0].text).toContain(`(ID: ${noteId})`);
      
      expect(result.content[1].type).toBe('application/json');
      const jsonData = JSON.parse(result.content[1].text);
      expect(jsonData.operation).toBe('update_note');
      expect(jsonData.request.noteId).toBe(noteId);
      expect(jsonData.request.contentLength).toBe(content.length);
      expect(jsonData.result.noteId).toBe(noteId);
      expect(jsonData.result.title).toBe('JavaScript Fundamentals');
    });

    test('should handle note with empty title', async () => {
      // Arrange
      const noteId = 'note456def';
      const content = 'Some content';
      const noteWithoutTitle = {
        ...mockNote,
        noteId,
        title: null
      };
      const updatedNote = {
        ...noteWithoutTitle,
        dateModified: '2024-01-25T15:30:00.000Z'
      };

      mockClient.get.mockResolvedValueOnce(noteWithoutTitle);
      mockClient.put.mockResolvedValueOnce({});
      mockClient.get.mockResolvedValueOnce(updatedNote);

      // Act
      const result = await updateNote(mockClient, { noteId, content });

      // Assert
      expect(result.content[0].text).toContain('Note updated: "Untitled"');
    });

    test('should handle different note types', async () => {
      // Arrange
      const noteId = 'note789ghi';
      const content = 'console.log("Updated code");';
      const codeNote = {
        ...mockCodeNote,
        noteId
      };
      const updatedNote = {
        ...codeNote,
        dateModified: '2024-01-25T15:30:00.000Z'
      };

      mockClient.get.mockResolvedValueOnce(codeNote);
      mockClient.put.mockResolvedValueOnce({});
      mockClient.get.mockResolvedValueOnce(updatedNote);

      // Act
      const result = await updateNote(mockClient, { noteId, content });

      // Assert
      const jsonData = JSON.parse(result.content[1].text);
      expect(jsonData.result.type).toBe('code');
    });

    test('should include content length in response', async () => {
      // Arrange
      const noteId = 'note101jkl';
      const largeContent = 'A'.repeat(10000); // 10KB content
      const existingNote = mockNote;
      const updatedNote = {
        ...existingNote,
        dateModified: '2024-01-25T15:30:00.000Z'
      };

      mockClient.get.mockResolvedValueOnce(existingNote);
      mockClient.put.mockResolvedValueOnce({});
      mockClient.get.mockResolvedValueOnce(updatedNote);

      // Act
      const result = await updateNote(mockClient, { noteId, content: largeContent });

      // Assert
      const jsonData = JSON.parse(result.content[1].text);
      expect(jsonData.request.contentLength).toBe(largeContent.length);
    });
  });

  describe('Input validation', () => {
    test('should reject empty noteId', async () => {
      // Act
      const result = await updateNote(mockClient, { noteId: '', content: 'test' });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error:');
      expect(result.content[0].text).toContain('Note ID must be a non-empty string');
      expect(mockClient.get).not.toHaveBeenCalled();
      expect(mockClient.put).not.toHaveBeenCalled();
    });

    test('should reject null noteId', async () => {
      // Act
      const result = await updateNote(mockClient, { noteId: null, content: 'test' });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Note ID must be a non-empty string');
    });

    test('should reject null content', async () => {
      // Act
      const result = await updateNote(mockClient, { noteId: 'note123', content: null });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Content cannot be null or undefined');
    });

    test('should reject content exceeding maximum size', async () => {
      // Arrange
      const oversizedContent = 'A'.repeat(1000001); // > 1MB

      // Act
      const result = await updateNote(mockClient, { noteId: 'note123', content: oversizedContent });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Content cannot exceed 1MB');
    });

    test('should accept content at maximum size limit', async () => {
      // Arrange
      const maxContent = 'A'.repeat(1000000); // Exactly 1MB
      const existingNote = mockNote;
      const updatedNote = { ...existingNote, dateModified: '2024-01-25T15:30:00.000Z' };

      mockClient.get.mockResolvedValueOnce(existingNote);
      mockClient.put.mockResolvedValueOnce({});
      mockClient.get.mockResolvedValueOnce(updatedNote);

      // Act
      const result = await updateNote(mockClient, { noteId: 'note123', content: maxContent });

      // Assert
      expect(result.isError).not.toBe(true);
      expect(mockClient.put).toHaveBeenCalledWith('notes/note123/content', { content: maxContent });
    });
  });

  describe('Note existence checks', () => {
    test('should handle note not found (404)', async () => {
      // Arrange
      const noteId = 'nonexistent123';
      const content = 'test content';
      const error = new TriliumAPIError('Note not found', 404);
      mockClient.get.mockRejectedValueOnce(error);

      // Act
      const result = await updateNote(mockClient, { noteId, content });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(`Note not found: ${noteId}`);
      expect(mockClient.put).not.toHaveBeenCalled();
    });

    test('should handle null response when checking note existence', async () => {
      // Arrange
      const noteId = 'note123abc';
      const content = 'test content';
      mockClient.get.mockResolvedValueOnce(null);

      // Act
      const result = await updateNote(mockClient, { noteId, content });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(`Note not found: ${noteId}`);
      expect(mockClient.put).not.toHaveBeenCalled();
    });
  });

  describe('Update operation errors', () => {
    test('should handle forbidden error (403) on update', async () => {
      // Arrange
      const noteId = 'note123abc';
      const content = 'test content';
      const existingNote = mockNote;
      const error = new TriliumAPIError('Access forbidden', 403);

      mockClient.get.mockResolvedValueOnce(existingNote);
      mockClient.put.mockRejectedValueOnce(error);

      // Act
      const result = await updateNote(mockClient, { noteId, content });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied: Cannot update note');
      expect(result.content[0].text).toContain(noteId);
    });

    test('should handle unauthorized error (401) on update', async () => {
      // Arrange
      const noteId = 'note123abc';
      const content = 'test content';
      const existingNote = mockNote;
      const error = new TriliumAPIError('Authentication failed', 401);

      mockClient.get.mockResolvedValueOnce(existingNote);
      mockClient.put.mockRejectedValueOnce(error);

      // Act
      const result = await updateNote(mockClient, { noteId, content });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('TriliumNext API error: Authentication failed');
    });

    test('should handle server error (500) on update', async () => {
      // Arrange
      const noteId = 'note123abc';
      const content = 'test content';
      const existingNote = mockNote;
      const error = new TriliumAPIError('Internal server error', 500);

      mockClient.get.mockResolvedValueOnce(existingNote);
      mockClient.put.mockRejectedValueOnce(error);

      // Act
      const result = await updateNote(mockClient, { noteId, content });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('TriliumNext API error: Internal server error');
    });

    test('should handle network errors on update', async () => {
      // Arrange
      const noteId = 'note123abc';
      const content = 'test content';
      const existingNote = mockNote;
      const error = new Error('Network Error');
      error.code = 'ECONNREFUSED';

      mockClient.get.mockResolvedValueOnce(existingNote);
      mockClient.put.mockRejectedValueOnce(error);

      // Act
      const result = await updateNote(mockClient, { noteId, content });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to update note: Network Error');
    });
  });

  describe('Structured response format', () => {
    test('should return structured JSON data for successful updates', async () => {
      // Arrange
      const noteId = 'note123abc';
      const content = 'Test content';
      const existingNote = mockNote;
      const updatedNote = { ...existingNote, dateModified: '2024-01-25T15:30:00.000Z' };

      mockClient.get.mockResolvedValueOnce(existingNote);
      mockClient.put.mockResolvedValueOnce({});
      mockClient.get.mockResolvedValueOnce(updatedNote);

      // Act
      const result = await updateNote(mockClient, { noteId, content });

      // Assert
      const jsonData = JSON.parse(result.content[1].text);
      expect(jsonData).toHaveProperty('operation', 'update_note');
      expect(jsonData).toHaveProperty('timestamp');
      expect(jsonData.request).toEqual({
        noteId,
        contentLength: content.length
      });
      expect(jsonData.result).toMatchObject({
        noteId,
        title: 'JavaScript Fundamentals',
        type: 'text',
        triliumUrl: `trilium://note/${noteId}`
      });
    });

    test('should return structured JSON data for errors', async () => {
      // Arrange
      const noteId = 'note123abc';
      const content = null;

      // Act
      const result = await updateNote(mockClient, { noteId, content });

      // Assert
      expect(result.isError).toBe(true);
      const jsonData = JSON.parse(result.content[1].text);
      expect(jsonData).toHaveProperty('operation', 'update_note');
      expect(jsonData).toHaveProperty('timestamp');
      expect(jsonData.error).toMatchObject({
        type: 'ValidationError',
        message: 'Content cannot be null or undefined'
      });
    });
  });

  describe('API call sequence', () => {
    test('should make API calls in correct order', async () => {
      // Arrange
      const noteId = 'note123abc';
      const content = 'Updated content';
      const existingNote = mockNote;
      const updatedNote = { ...existingNote, dateModified: '2024-01-25T15:30:00.000Z' };

      mockClient.get.mockResolvedValueOnce(existingNote);
      mockClient.put.mockResolvedValueOnce({});
      mockClient.get.mockResolvedValueOnce(updatedNote);

      // Act
      await updateNote(mockClient, { noteId, content });

      // Assert
      expect(mockClient.get).toHaveBeenNthCalledWith(1, `notes/${noteId}`);
      expect(mockClient.put).toHaveBeenNthCalledWith(1, `notes/${noteId}/content`, { content });
      expect(mockClient.get).toHaveBeenNthCalledWith(2, `notes/${noteId}`);
      expect(mockClient.get).toHaveBeenCalledTimes(2);
      expect(mockClient.put).toHaveBeenCalledTimes(1);
    });

    test('should not make update call if note existence check fails', async () => {
      // Arrange
      const noteId = 'nonexistent123';
      const content = 'test content';
      const error = new TriliumAPIError('Note not found', 404);
      mockClient.get.mockRejectedValueOnce(error);

      // Act
      await updateNote(mockClient, { noteId, content });

      // Assert
      expect(mockClient.get).toHaveBeenCalledTimes(1);
      expect(mockClient.put).not.toHaveBeenCalled();
    });
  });
});