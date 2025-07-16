import { jest } from '@jest/globals';
import { createNote } from '../src/tools/create-note.js';
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

describe('createNote', () => {
  let mockTriliumClient;

  beforeEach(() => {
    // Create a fresh mock for each test
    mockTriliumClient = {
      post: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('successful note creation', () => {
    test('should create basic text note successfully', async () => {
      const mockResponse = {
        note: {
          noteId: 'abc123',
          title: 'My Test Note',
          type: 'text',
          dateCreated: '2024-01-15T14:30:00.000Z',
          dateModified: '2024-01-15T14:30:00.000Z'
        }
      };

      mockTriliumClient.post.mockResolvedValue(mockResponse);

      const result = await createNote(mockTriliumClient, {
        title: 'My Test Note',
        content: 'This is the note content',
        type: 'text'
      });

      expect(mockTriliumClient.post).toHaveBeenCalledWith('create-note', {
        title: 'My Test Note',
        content: 'This is the note content',
        type: 'text'
      });

      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Note created: "My Test Note" (ID: abc123)');
      expect(result.content[1].type).toBe('application/json');
      
      const jsonData = JSON.parse(result.content[1].text);
      expect(jsonData.operation).toBe('create_note');
      expect(jsonData.request.title).toBe('My Test Note');
      expect(jsonData.request.type).toBe('text');
      expect(jsonData.request.contentLength).toBe(24);
      expect(jsonData.result.noteId).toBe('abc123');
      expect(jsonData.result.triliumUrl).toBe('trilium://note/abc123');
    });

    test('should create note with parent successfully', async () => {
      const mockResponse = {
        note: {
          noteId: 'child123',
          title: 'Child Note',
          type: 'text',
          parentNoteId: 'parent456'
        }
      };

      mockTriliumClient.post.mockResolvedValue(mockResponse);

      const result = await createNote(mockTriliumClient, {
        title: 'Child Note',
        content: 'Child content',
        type: 'text',
        parentNoteId: 'parent456'
      });

      expect(mockTriliumClient.post).toHaveBeenCalledWith('create-note', {
        title: 'Child Note',
        content: 'Child content',
        type: 'text',
        parentNoteId: 'parent456'
      });

      const jsonData = JSON.parse(result.content[1].text);
      expect(jsonData.request.parentNoteId).toBe('parent456');
    });

    test('should create different note types', async () => {
      const mockResponse = {
        note: {
          noteId: 'code123',
          title: 'JavaScript Code',
          type: 'code'
        }
      };

      mockTriliumClient.post.mockResolvedValue(mockResponse);

      await createNote(mockTriliumClient, {
        title: 'JavaScript Code',
        content: 'console.log("Hello World");',
        type: 'code'
      });

      expect(mockTriliumClient.post).toHaveBeenCalledWith('create-note', {
        title: 'JavaScript Code',
        content: 'console.log("Hello World");',
        type: 'code'
      });
    });

    test('should default to root parentNoteId when not provided', async () => {
      const mockResponse = {
        note: {
          noteId: 'root123',
          title: 'Root Note',
          type: 'text'
        }
      };

      mockTriliumClient.post.mockResolvedValue(mockResponse);

      const result = await createNote(mockTriliumClient, {
        title: 'Root Note',
        content: 'Root content',
        type: 'text'
      });

      expect(mockTriliumClient.post).toHaveBeenCalledWith('create-note', {
        title: 'Root Note',
        content: 'Root content',
        type: 'text'
      });

      const jsonData = JSON.parse(result.content[1].text);
      expect(jsonData.request.parentNoteId).toBe('root');
    });

    test('should preserve additional API response fields', async () => {
      const mockResponse = {
        note: {
          noteId: 'abc123',
          title: 'My Note',
          type: 'text',
          isProtected: false,
          mime: 'text/html',
          attributes: ['#tag1', '#tag2']
        }
      };

      mockTriliumClient.post.mockResolvedValue(mockResponse);

      const result = await createNote(mockTriliumClient, {
        title: 'My Note',
        content: 'Content',
        type: 'text'
      });

      const jsonData = JSON.parse(result.content[1].text);
      expect(jsonData.result.isProtected).toBe(false);
      expect(jsonData.result.mime).toBe('text/html');
      expect(jsonData.result.attributes).toEqual(['#tag1', '#tag2']);
    });
  });

  describe('input validation', () => {
    test('should reject empty title', async () => {
      const result = await createNote(mockTriliumClient, {
        title: '',
        content: 'Content',
        type: 'text'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error:');
      expect(mockTriliumClient.post).not.toHaveBeenCalled();
    });

    test('should reject whitespace-only title', async () => {
      const result = await createNote(mockTriliumClient, {
        title: '   \t\n   ',
        content: 'Content',
        type: 'text'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error:');
      expect(mockTriliumClient.post).not.toHaveBeenCalled();
    });

    test('should reject title that is too long', async () => {
      const longTitle = 'A'.repeat(201); // Exceeds 200 character limit

      const result = await createNote(mockTriliumClient, {
        title: longTitle,
        content: 'Content',
        type: 'text'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error:');
      expect(mockTriliumClient.post).not.toHaveBeenCalled();
    });

    test('should reject non-string title', async () => {
      const result = await createNote(mockTriliumClient, {
        title: 123,
        content: 'Content',
        type: 'text'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error:');
      expect(mockTriliumClient.post).not.toHaveBeenCalled();
    });

    test('should reject null/undefined title', async () => {
      const result = await createNote(mockTriliumClient, {
        title: null,
        content: 'Content',
        type: 'text'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error:');
      expect(mockTriliumClient.post).not.toHaveBeenCalled();
    });

    test('should reject non-string content', async () => {
      const result = await createNote(mockTriliumClient, {
        title: 'Valid Title',
        content: 123,
        type: 'text'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error:');
      expect(mockTriliumClient.post).not.toHaveBeenCalled();
    });

    test('should reject invalid note type', async () => {
      const result = await createNote(mockTriliumClient, {
        title: 'Valid Title',
        content: 'Valid content',
        type: 'invalid-type'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error:');
      expect(mockTriliumClient.post).not.toHaveBeenCalled();
    });

    test('should accept valid note types', async () => {
      const validTypes = ['text', 'code', 'file', 'image', 'search', 'book'];
      const mockResponse = {
        note: {
          noteId: 'test123',
          title: 'Test Note',
          type: 'text'
        }
      };

      for (const type of validTypes) {
        mockTriliumClient.post.mockResolvedValue(mockResponse);

        const result = await createNote(mockTriliumClient, {
          title: 'Test Note',
          content: 'Test content',
          type: type
        });

        expect(result.isError).not.toBe(true);
        mockTriliumClient.post.mockClear();
      }
    });

    test('should reject invalid parentNoteId format', async () => {
      const result = await createNote(mockTriliumClient, {
        title: 'Valid Title',
        content: 'Valid content',
        type: 'text',
        parentNoteId: '   '  // whitespace-only should trigger validation error
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error:');
      expect(mockTriliumClient.post).not.toHaveBeenCalled();
    });

    test('should trim whitespace from title', async () => {
      const mockResponse = {
        note: {
          noteId: 'abc123',
          title: 'Trimmed Title',
          type: 'text'
        }
      };

      mockTriliumClient.post.mockResolvedValue(mockResponse);

      await createNote(mockTriliumClient, {
        title: '  Trimmed Title  ',
        content: 'Content',
        type: 'text'
      });

      expect(mockTriliumClient.post).toHaveBeenCalledWith('create-note', {
        title: 'Trimmed Title',
        content: 'Content',
        type: 'text'
      });
    });
  });

  describe('API error handling', () => {
    test('should handle TriliumNext API errors', async () => {
      const apiError = new TriliumAPIError('Server unavailable', 503);
      mockTriliumClient.post.mockRejectedValue(apiError);

      const result = await createNote(mockTriliumClient, {
        title: 'Test Note',
        content: 'Test content',
        type: 'text'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('TriliumNext API error: Server unavailable');
      
      const jsonData = JSON.parse(result.content[1].text);
      expect(jsonData.error.type).toBe('TriliumAPIError');
      expect(jsonData.error.status).toBe(503);
      expect(jsonData.error.message).toBe('Server unavailable');
    });

    test('should handle authentication errors', async () => {
      const authError = new TriliumAPIError('Authentication failed', 401);
      mockTriliumClient.post.mockRejectedValue(authError);

      const result = await createNote(mockTriliumClient, {
        title: 'Test Note',
        content: 'Test content',
        type: 'text'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('TriliumNext API error: Authentication failed');
      
      const jsonData = JSON.parse(result.content[1].text);
      expect(jsonData.error.status).toBe(401);
    });

    test('should handle invalid API response format', async () => {
      // Return response without note or noteId
      mockTriliumClient.post.mockResolvedValue({ invalid: 'response' });

      const result = await createNote(mockTriliumClient, {
        title: 'Test Note',
        content: 'Test content',
        type: 'text'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('TriliumNext API error: Invalid response from TriliumNext API - missing note ID');
    });

    test('should handle network errors', async () => {
      const networkError = new Error('Network timeout');
      mockTriliumClient.post.mockRejectedValue(networkError);

      const result = await createNote(mockTriliumClient, {
        title: 'Test Note',
        content: 'Test content',
        type: 'text'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Note creation failed: Network timeout');
      
      const jsonData = JSON.parse(result.content[1].text);
      expect(jsonData.error.type).toBe('Error');
      expect(jsonData.error.message).toBe('Network timeout');
    });

    test('should include error context in structured response', async () => {
      const apiError = new TriliumAPIError('Server error', 500, { details: 'Database connection failed' });
      mockTriliumClient.post.mockRejectedValue(apiError);

      const result = await createNote(mockTriliumClient, {
        title: 'Test Note',
        content: 'Test content',
        type: 'text'
      });

      const jsonData = JSON.parse(result.content[1].text);
      expect(jsonData.operation).toBe('create_note');
      expect(jsonData.request.title).toBe('Test Note');
      expect(jsonData.request.contentLength).toBe(12);
      expect(jsonData.error.details).toEqual({ details: 'Database connection failed' });
    });
  });

  describe('edge cases', () => {
    test('should handle very long content', async () => {
      const longContent = 'A'.repeat(10000);
      const mockResponse = {
        note: {
          noteId: 'long123',
          title: 'Long Content Note',
          type: 'text'
        }
      };

      mockTriliumClient.post.mockResolvedValue(mockResponse);

      const result = await createNote(mockTriliumClient, {
        title: 'Long Content Note',
        content: longContent,
        type: 'text'
      });

      expect(result.content[0].text).toBe('Note created: "Long Content Note" (ID: long123)');
      
      const jsonData = JSON.parse(result.content[1].text);
      expect(jsonData.request.contentLength).toBe(10000);
    });

    test('should handle special characters in title and content', async () => {
      const mockResponse = {
        note: {
          noteId: 'special123',
          title: 'Special & "Chars" <Test>',
          type: 'text'
        }
      };

      mockTriliumClient.post.mockResolvedValue(mockResponse);

      const result = await createNote(mockTriliumClient, {
        title: 'Special & "Chars" <Test>',
        content: 'Content with special chars: !@#$%^&*(){}[]|\\:";\'<>?,./',
        type: 'text'
      });

      expect(mockTriliumClient.post).toHaveBeenCalledWith('create-note', {
        title: 'Special & "Chars" <Test>',
        content: 'Content with special chars: !@#$%^&*(){}[]|\\:";\'<>?,./',
        type: 'text'
      });

      expect(result.content[0].text).toBe('Note created: "Special & "Chars" <Test>" (ID: special123)');
    });

    test('should handle Unicode characters', async () => {
      const mockResponse = {
        note: {
          noteId: 'unicode123',
          title: '日本語のノート 🌸',
          type: 'text'
        }
      };

      mockTriliumClient.post.mockResolvedValue(mockResponse);

      const result = await createNote(mockTriliumClient, {
        title: '日本語のノート 🌸',
        content: 'Unicode content: 你好世界 🌍 Здравствуй мир',
        type: 'text'
      });

      expect(result.content[0].text).toBe('Note created: "日本語のノート 🌸" (ID: unicode123)');
      
      const jsonData = JSON.parse(result.content[1].text);
      expect(jsonData.request.title).toBe('日本語のノート 🌸');
    });

    test('should handle empty content', async () => {
      const mockResponse = {
        note: {
          noteId: 'empty123',
          title: 'Empty Content Note',
          type: 'text'
        }
      };

      mockTriliumClient.post.mockResolvedValue(mockResponse);

      const result = await createNote(mockTriliumClient, {
        title: 'Empty Content Note',
        content: '',
        type: 'text'
      });

      const jsonData = JSON.parse(result.content[1].text);
      expect(jsonData.request.contentLength).toBe(0);
    });

    test('should handle missing optional response fields gracefully', async () => {
      const mockResponse = {
        note: {
          noteId: 'minimal123'
          // Missing title, type, and other optional fields
        }
      };

      mockTriliumClient.post.mockResolvedValue(mockResponse);

      const result = await createNote(mockTriliumClient, {
        title: 'Test Note',
        content: 'Test content',
        type: 'text'
      });

      expect(result.content[0].text).toBe('Note created: "Test Note" (ID: minimal123)');
      
      const jsonData = JSON.parse(result.content[1].text);
      expect(jsonData.result.noteId).toBe('minimal123');
    });
  });
});