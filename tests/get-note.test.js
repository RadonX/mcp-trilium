import { jest } from '@jest/globals';
import { getNote } from '../src/tools/get-note.js';
import { ValidationError } from '../src/utils/validation.js';
import { TriliumAPIError } from '../src/utils/trilium-client.js';

// Mock the logger to avoid console output during tests
jest.mock('../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('getNote', () => {
  let mockTriliumClient;

  beforeEach(() => {
    // Create a fresh mock for each test
    mockTriliumClient = {
      get: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('successful note retrieval', () => {
    test('should return note with text content', async () => {
      const mockNote = {
        noteId: 'note123',
        title: 'Test Note',
        type: 'text',
        mime: 'text/html',
        isProtected: false,
        isDeleted: false,
        dateCreated: '2024-01-01T10:00:00.000Z',
        dateModified: '2024-01-15T14:30:00.000Z',
        utcDateCreated: '2024-01-01T10:00:00.000Z',
        utcDateModified: '2024-01-15T14:30:00.000Z',
        parentNoteIds: ['parent123'],
        childNoteIds: ['child456'],
        attributes: []
      };
      const mockContent = 'This is the note content';

      mockTriliumClient.get
        .mockResolvedValueOnce(mockNote)
        .mockResolvedValueOnce(mockContent);

      const result = await getNote(mockTriliumClient, {
        noteId: 'note123'
      });

      expect(mockTriliumClient.get).toHaveBeenCalledTimes(2);
      expect(mockTriliumClient.get).toHaveBeenNthCalledWith(1, 'notes/note123');
      expect(mockTriliumClient.get).toHaveBeenNthCalledWith(2, 'notes/note123/content');

      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Note: "Test Note" (text, 24 chars)');
      
      expect(result.content[1].type).toBe('application/json');
      const parsedData = JSON.parse(result.content[1].text);
      expect(parsedData.operation).toBe('get_note');
      expect(parsedData.note.noteId).toBe('note123');
      expect(parsedData.note.title).toBe('Test Note');
      expect(parsedData.note.content.data).toBe('This is the note content');
      expect(parsedData.note.content.length).toBe(24);
      expect(parsedData.note.triliumUrl).toBe('trilium://note/note123');
    });

    test('should handle note with no title', async () => {
      const mockNote = {
        noteId: 'note123',
        type: 'text'
      };
      const mockContent = 'Content';

      mockTriliumClient.get
        .mockResolvedValueOnce(mockNote)
        .mockResolvedValueOnce(mockContent);

      const result = await getNote(mockTriliumClient, {
        noteId: 'note123'
      });

      expect(result.content[0].text).toBe('Note: "Untitled" (text, 7 chars)');
      
      const parsedData = JSON.parse(result.content[1].text);
      expect(parsedData.note.title).toBe('Untitled');
    });

    test('should handle large content with truncation', async () => {
      const mockNote = {
        noteId: 'note123',
        title: 'Large Note',
        type: 'text'
      };
      const largeContent = 'A'.repeat(15000); // Exceeds 10000 char limit

      mockTriliumClient.get
        .mockResolvedValueOnce(mockNote)
        .mockResolvedValueOnce(largeContent);

      const result = await getNote(mockTriliumClient, {
        noteId: 'note123'
      });

      const parsedData = JSON.parse(result.content[1].text);
      expect(parsedData.note.content.type).toBe('text');
      expect(parsedData.note.content.length).toBe(15000);
      expect(parsedData.note.content.truncated).toBe(true);
      expect(parsedData.note.content.fullLength).toBe(15000);
      expect(parsedData.note.content.preview).toBe('A'.repeat(1000) + '...');
      expect(parsedData.note.content.data).toBeUndefined();
    });

    test('should handle binary content', async () => {
      const mockNote = {
        noteId: 'note123',
        title: 'Image Note',
        type: 'image',
        mime: 'image/png'
      };
      const binaryContent = new ArrayBuffer(1024);

      mockTriliumClient.get
        .mockResolvedValueOnce(mockNote)
        .mockResolvedValueOnce(binaryContent);

      const result = await getNote(mockTriliumClient, {
        noteId: 'note123'
      });

      expect(result.content[0].text).toBe('Note: "Image Note" (image, binary)');
      
      const parsedData = JSON.parse(result.content[1].text);
      expect(parsedData.note.content.type).toBe('binary');
      expect(parsedData.note.content.length).toBe(0);
      expect(parsedData.note.content.data).toBeUndefined();
    });

    test('should include all note metadata when present', async () => {
      const mockNote = {
        noteId: 'note123',
        title: 'Complete Note',
        type: 'code',
        mime: 'text/javascript',
        isProtected: true,
        isDeleted: false,
        dateCreated: '2024-01-01T10:00:00.000Z',
        dateModified: '2024-01-15T14:30:00.000Z',
        utcDateCreated: '2024-01-01T10:00:00.000Z',
        utcDateModified: '2024-01-15T14:30:00.000Z',
        parentNoteIds: ['parent123', 'parent456'],
        childNoteIds: ['child789'],
        attributes: [{ name: 'lang', value: 'javascript' }]
      };
      const mockContent = 'console.log("hello");';

      mockTriliumClient.get
        .mockResolvedValueOnce(mockNote)
        .mockResolvedValueOnce(mockContent);

      const result = await getNote(mockTriliumClient, {
        noteId: 'note123'
      });

      const parsedData = JSON.parse(result.content[1].text);
      expect(parsedData.note.isProtected).toBe(true);
      expect(parsedData.note.parentNoteIds).toEqual(['parent123', 'parent456']);
      expect(parsedData.note.childNoteIds).toEqual(['child789']);
      expect(parsedData.note.attributes).toEqual([{ name: 'lang', value: 'javascript' }]);
      expect(parsedData.note.mime).toBe('text/javascript');
    });
  });

  describe('input validation', () => {
    test('should reject empty noteId', async () => {
      const result = await getNote(mockTriliumClient, {
        noteId: ''
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error:');
      expect(mockTriliumClient.get).not.toHaveBeenCalled();
    });

    test('should reject null noteId', async () => {
      const result = await getNote(mockTriliumClient, {
        noteId: null
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error:');
      expect(mockTriliumClient.get).not.toHaveBeenCalled();
    });

    test('should reject undefined noteId', async () => {
      const result = await getNote(mockTriliumClient, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error:');
      expect(mockTriliumClient.get).not.toHaveBeenCalled();
    });

    test('should reject non-string noteId', async () => {
      const result = await getNote(mockTriliumClient, {
        noteId: 123
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error:');
      expect(mockTriliumClient.get).not.toHaveBeenCalled();
    });

    test('should accept noteId with special characters', async () => {
      const mockNote = { noteId: 'note/123!', title: 'Test' };
      const mockContent = 'Content';

      mockTriliumClient.get
        .mockResolvedValueOnce(mockNote)
        .mockResolvedValueOnce(mockContent);

      const result = await getNote(mockTriliumClient, {
        noteId: 'note/123!'
      });

      expect(result.isError).toBeFalsy();
      expect(mockTriliumClient.get).toHaveBeenCalledWith('notes/note/123!');
    });

    test('should trim whitespace from noteId', async () => {
      const mockNote = { noteId: 'note123', title: 'Test' };
      const mockContent = 'Content';

      mockTriliumClient.get
        .mockResolvedValueOnce(mockNote)
        .mockResolvedValueOnce(mockContent);

      await getNote(mockTriliumClient, {
        noteId: '  note123  '
      });

      expect(mockTriliumClient.get).toHaveBeenCalledWith('notes/note123');
    });
  });

  describe('API error handling', () => {
    test('should handle note not found (404)', async () => {
      const notFoundError = new TriliumAPIError('Note not found', 404);
      mockTriliumClient.get.mockRejectedValue(notFoundError);

      const result = await getNote(mockTriliumClient, {
        noteId: 'nonexistent123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Note not found: nonexistent123');
    });

    test('should handle authentication error (401)', async () => {
      const authError = new TriliumAPIError('Authentication failed', 401);
      mockTriliumClient.get.mockRejectedValue(authError);

      const result = await getNote(mockTriliumClient, {
        noteId: 'note123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('TriliumNext API error: Authentication failed');
    });

    test('should handle server error (500)', async () => {
      const serverError = new TriliumAPIError('Internal server error', 500);
      mockTriliumClient.get.mockRejectedValue(serverError);

      const result = await getNote(mockTriliumClient, {
        noteId: 'note123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('TriliumNext API error: Internal server error');
    });

    test('should handle network errors', async () => {
      const networkError = new Error('Network timeout');
      mockTriliumClient.get.mockRejectedValue(networkError);

      const result = await getNote(mockTriliumClient, {
        noteId: 'note123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to get note: Network timeout');
    });

    test('should handle missing note data', async () => {
      mockTriliumClient.get.mockResolvedValueOnce(null);

      const result = await getNote(mockTriliumClient, {
        noteId: 'note123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Note not found: note123');
    });

    test('should handle content fetch error after successful note fetch', async () => {
      const mockNote = {
        noteId: 'note123',
        title: 'Test Note',
        type: 'text'
      };
      
      mockTriliumClient.get
        .mockResolvedValueOnce(mockNote)
        .mockRejectedValueOnce(new TriliumAPIError('Content not accessible', 403));

      const result = await getNote(mockTriliumClient, {
        noteId: 'note123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('TriliumNext API error: Content not accessible');
    });
  });

  describe('validation error responses include structured data', () => {
    test('should include structured data in validation error response', async () => {
      const result = await getNote(mockTriliumClient, {
        noteId: ''
      });

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(2);
      expect(result.content[1].type).toBe('application/json');
      
      const parsedData = JSON.parse(result.content[1].text);
      expect(parsedData.operation).toBe('get_note');
      expect(parsedData.error.type).toBe('ValidationError');
      expect(parsedData.timestamp).toBeDefined();
    });
  });

  describe('API error responses include structured data', () => {
    test('should include structured data in API error response', async () => {
      const apiError = new TriliumAPIError('Server error', 500);
      mockTriliumClient.get.mockRejectedValue(apiError);

      const result = await getNote(mockTriliumClient, {
        noteId: 'note123'
      });

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(2);
      expect(result.content[1].type).toBe('application/json');
      
      const parsedData = JSON.parse(result.content[1].text);
      expect(parsedData.operation).toBe('get_note');
      expect(parsedData.error.type).toBe('TriliumAPIError');
      expect(parsedData.error.status).toBe(500);
      expect(parsedData.timestamp).toBeDefined();
    });
  });

  describe('edge cases', () => {
    test('should handle empty content', async () => {
      const mockNote = {
        noteId: 'note123',
        title: 'Empty Note',
        type: 'text'
      };
      const mockContent = '';

      mockTriliumClient.get
        .mockResolvedValueOnce(mockNote)
        .mockResolvedValueOnce(mockContent);

      const result = await getNote(mockTriliumClient, {
        noteId: 'note123'
      });

      expect(result.content[0].text).toBe('Note: "Empty Note" (text, 0 chars)');
      
      const parsedData = JSON.parse(result.content[1].text);
      expect(parsedData.note.content.data).toBe('');
      expect(parsedData.note.content.length).toBe(0);
    });

    test('should handle Unicode characters in title and content', async () => {
      const mockNote = {
        noteId: 'note123',
        title: '日本語のノート 🌸',
        type: 'text'
      };
      const mockContent = 'こんにちは世界 🎌';

      mockTriliumClient.get
        .mockResolvedValueOnce(mockNote)
        .mockResolvedValueOnce(mockContent);

      const result = await getNote(mockTriliumClient, {
        noteId: 'note123'
      });

      expect(result.content[0].text).toContain('日本語のノート 🌸');
      
      const parsedData = JSON.parse(result.content[1].text);
      expect(parsedData.note.title).toBe('日本語のノート 🌸');
      expect(parsedData.note.content.data).toBe('こんにちは世界 🎌');
    });

    test('should handle very long note title', async () => {
      const longTitle = 'A'.repeat(200);
      const mockNote = {
        noteId: 'note123',
        title: longTitle,
        type: 'text'
      };
      const mockContent = 'Content';

      mockTriliumClient.get
        .mockResolvedValueOnce(mockNote)
        .mockResolvedValueOnce(mockContent);

      const result = await getNote(mockTriliumClient, {
        noteId: 'note123'
      });

      expect(result.content[0].text).toContain(longTitle);
      
      const parsedData = JSON.parse(result.content[1].text);
      expect(parsedData.note.title).toBe(longTitle);
    });

    test('should handle note with all optional fields missing', async () => {
      const mockNote = {
        noteId: 'note123'
        // All other fields missing
      };
      const mockContent = 'Basic content';

      mockTriliumClient.get
        .mockResolvedValueOnce(mockNote)
        .mockResolvedValueOnce(mockContent);

      const result = await getNote(mockTriliumClient, {
        noteId: 'note123'
      });

      const parsedData = JSON.parse(result.content[1].text);
      expect(parsedData.note.title).toBe('Untitled');
      expect(parsedData.note.type).toBe('text');
      expect(parsedData.note.isProtected).toBe(false);
      expect(parsedData.note.isDeleted).toBe(false);
      expect(parsedData.note.parentNoteIds).toEqual([]);
      expect(parsedData.note.childNoteIds).toEqual([]);
      expect(parsedData.note.attributes).toEqual([]);
    });
  });
});