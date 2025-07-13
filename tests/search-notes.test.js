import { jest } from '@jest/globals';
import { searchNotes } from '../src/tools/search-notes.js';
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

describe('searchNotes', () => {
  let mockTriliumClient;

  beforeEach(() => {
    // Create a fresh mock for each test
    mockTriliumClient = {
      get: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('successful searches', () => {
    test('should return formatted results for basic fulltext search', async () => {
      const mockResponse = {
        results: [
          {
            noteId: 'note123',
            title: 'JavaScript Programming',
            type: 'text',
            dateModified: '2024-01-15T14:30:00.000Z',
            parentNoteId: 'parent456'
          },
          {
            noteId: 'note789',
            title: 'Advanced JavaScript',
            type: 'code',
            dateModified: '2024-01-14T10:15:00.000Z',
            parentNoteId: 'parent456'
          }
        ]
      };

      mockTriliumClient.get.mockResolvedValue(mockResponse);

      const result = await searchNotes(mockTriliumClient, {
        query: 'javascript programming',
        limit: 10
      });

      expect(mockTriliumClient.get).toHaveBeenCalledWith('notes?search=javascript+programming&limit=10');
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('🔍 **Search Results** (2 of 10 max)');
      expect(result.content[0].text).toContain('**Query:** "javascript programming"');
      expect(result.content[0].text).toContain('1. **JavaScript Programming**');
      expect(result.content[0].text).toContain('   - ID: `note123`');
      expect(result.content[0].text).toContain('   - Type: text');
      expect(result.content[0].text).toContain('2. **Advanced JavaScript**');
      expect(result.content[0].text).toContain('   - ID: `note789`');
      expect(result.content[0].text).toContain('   - Type: code');
    });

    test('should handle exact match search with quotes', async () => {
      const mockResponse = {
        results: [
          {
            noteId: 'note456',
            title: 'The Two Towers',
            type: 'text',
            dateModified: '2024-01-15T14:30:00.000Z'
          }
        ]
      };

      mockTriliumClient.get.mockResolvedValue(mockResponse);

      const result = await searchNotes(mockTriliumClient, {
        query: '"Two Towers"',
        limit: 5
      });

      expect(mockTriliumClient.get).toHaveBeenCalledWith('notes?search=%22Two+Towers%22&limit=5');
      expect(result.content[0].text).toContain('**Query:** ""Two Towers""');
      expect(result.content[0].text).toContain('1. **The Two Towers**');
    });

    test('should handle label-based search', async () => {
      const mockResponse = {
        results: [
          {
            noteId: 'note789',
            title: 'JavaScript Book',
            type: 'book',
            dateModified: '2024-01-15T14:30:00.000Z'
          }
        ]
      };

      mockTriliumClient.get.mockResolvedValue(mockResponse);

      const result = await searchNotes(mockTriliumClient, {
        query: '#book javascript',
        limit: 10
      });

      expect(mockTriliumClient.get).toHaveBeenCalledWith('notes?search=%23book+javascript&limit=10');
      expect(result.content[0].text).toContain('**Query:** "#book javascript"');
    });

    test('should use default limit when not specified', async () => {
      const mockResponse = { results: [] };
      mockTriliumClient.get.mockResolvedValue(mockResponse);

      await searchNotes(mockTriliumClient, {
        query: 'test query'
      });

      expect(mockTriliumClient.get).toHaveBeenCalledWith('notes?search=test+query&limit=10');
    });

    test('should handle notes with missing optional fields', async () => {
      const mockResponse = {
        results: [
          {
            noteId: 'note123',
            // Missing title, type, dateModified, parentNoteId
          }
        ]
      };

      mockTriliumClient.get.mockResolvedValue(mockResponse);

      const result = await searchNotes(mockTriliumClient, {
        query: 'test',
        limit: 10
      });

      expect(result.content[0].text).toContain('1. **Untitled**');
      expect(result.content[0].text).toContain('   - Type: text');
      expect(result.content[0].text).not.toContain('Modified:');
      expect(result.content[0].text).not.toContain('Parent:');
    });

    test('should include all optional fields when present', async () => {
      const mockResponse = {
        results: [
          {
            noteId: 'note123',
            title: 'Complete Note',
            type: 'code',
            dateModified: '2024-01-15T14:30:00.000Z',
            parentNoteId: 'parent456'
          }
        ]
      };

      mockTriliumClient.get.mockResolvedValue(mockResponse);

      const result = await searchNotes(mockTriliumClient, {
        query: 'test',
        limit: 10
      });

      expect(result.content[0].text).toContain('1. **Complete Note**');
      expect(result.content[0].text).toContain('   - Type: code');
      expect(result.content[0].text).toContain('   - Modified: 1/15/2024');
      expect(result.content[0].text).toContain('   - Parent: parent456');
    });
  });

  describe('empty results', () => {
    test('should return helpful message when no notes found', async () => {
      mockTriliumClient.get.mockResolvedValue({ results: [] });

      const result = await searchNotes(mockTriliumClient, {
        query: 'nonexistent query',
        limit: 10
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('🔍 **No notes found**');
      expect(result.content[0].text).toContain('Your search for "nonexistent query" didn\'t return any results.');
      expect(result.content[0].text).toContain('**Suggestions:**');
      expect(result.content[0].text).toContain('- Try using different keywords');
    });
  });

  describe('input validation', () => {
    test('should reject empty query', async () => {
      const result = await searchNotes(mockTriliumClient, {
        query: '',
        limit: 10
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ **Validation Error:** Search query must be a non-empty string');
      expect(mockTriliumClient.get).not.toHaveBeenCalled();
    });

    test('should reject whitespace-only query', async () => {
      const result = await searchNotes(mockTriliumClient, {
        query: '   \t\n   ',
        limit: 10
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ **Validation Error:** Search query cannot be empty');
      expect(mockTriliumClient.get).not.toHaveBeenCalled();
    });

    test('should reject query that is too long', async () => {
      const longQuery = 'a'.repeat(501); // Exceeds 500 character limit

      const result = await searchNotes(mockTriliumClient, {
        query: longQuery,
        limit: 10
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ **Validation Error:** Search query cannot exceed 500 characters');
      expect(mockTriliumClient.get).not.toHaveBeenCalled();
    });

    test('should reject non-string query', async () => {
      const result = await searchNotes(mockTriliumClient, {
        query: 123,
        limit: 10
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ **Validation Error:** Search query must be a non-empty string');
      expect(mockTriliumClient.get).not.toHaveBeenCalled();
    });

    test('should reject null/undefined query', async () => {
      const result = await searchNotes(mockTriliumClient, {
        query: null,
        limit: 10
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ **Validation Error:** Search query must be a non-empty string');
      expect(mockTriliumClient.get).not.toHaveBeenCalled();
    });

    test('should reject limit less than 1', async () => {
      const result = await searchNotes(mockTriliumClient, {
        query: 'test',
        limit: 0
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ **Validation Error:** Limit must be a positive integer');
      expect(mockTriliumClient.get).not.toHaveBeenCalled();
    });

    test('should reject limit greater than 100', async () => {
      const result = await searchNotes(mockTriliumClient, {
        query: 'test',
        limit: 101
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ **Validation Error:** Limit cannot exceed 100');
      expect(mockTriliumClient.get).not.toHaveBeenCalled();
    });

    test('should reject non-numeric limit', async () => {
      const result = await searchNotes(mockTriliumClient, {
        query: 'test',
        limit: 'invalid'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ **Validation Error:** Limit must be a positive integer');
      expect(mockTriliumClient.get).not.toHaveBeenCalled();
    });

    test('should accept valid limit boundaries', async () => {
      mockTriliumClient.get.mockResolvedValue({ results: [] });

      // Test minimum valid limit
      await searchNotes(mockTriliumClient, {
        query: 'test',
        limit: 1
      });

      expect(mockTriliumClient.get).toHaveBeenCalledWith('notes?search=test&limit=1');

      mockTriliumClient.get.mockClear();

      // Test maximum valid limit
      await searchNotes(mockTriliumClient, {
        query: 'test',
        limit: 100
      });

      expect(mockTriliumClient.get).toHaveBeenCalledWith('notes?search=test&limit=100');
    });

    test('should trim whitespace from query', async () => {
      mockTriliumClient.get.mockResolvedValue({ results: [] });

      await searchNotes(mockTriliumClient, {
        query: '  test query  ',
        limit: 10
      });

      expect(mockTriliumClient.get).toHaveBeenCalledWith('notes?search=test+query&limit=10');
    });
  });

  describe('API error handling', () => {
    test('should handle TriliumNext API errors', async () => {
      const apiError = new TriliumAPIError('Server unavailable', 503);
      mockTriliumClient.get.mockRejectedValue(apiError);

      const result = await searchNotes(mockTriliumClient, {
        query: 'test',
        limit: 10
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ **TriliumNext API Error:** Server unavailable');
      expect(result.content[0].text).toContain('Status: 503');
    });

    test('should handle authentication errors', async () => {
      const authError = new TriliumAPIError('Authentication failed', 401);
      mockTriliumClient.get.mockRejectedValue(authError);

      const result = await searchNotes(mockTriliumClient, {
        query: 'test',
        limit: 10
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ **TriliumNext API Error:** Authentication failed');
      expect(result.content[0].text).toContain('Status: 401');
    });

    test('should handle invalid API response format', async () => {
      // Return response without results array
      mockTriliumClient.get.mockResolvedValue({ invalid: 'response' });

      const result = await searchNotes(mockTriliumClient, {
        query: 'test',
        limit: 10
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ **TriliumNext API Error:** Invalid response from TriliumNext API - expected object with results array');
    });

    test('should handle network errors', async () => {
      const networkError = new Error('Network timeout');
      mockTriliumClient.get.mockRejectedValue(networkError);

      const result = await searchNotes(mockTriliumClient, {
        query: 'test',
        limit: 10
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ **Unexpected Error:** Network timeout');
    });
  });

  describe('URL encoding', () => {
    test('should properly encode special characters in search query', async () => {
      mockTriliumClient.get.mockResolvedValue({ results: [] });

      await searchNotes(mockTriliumClient, {
        query: 'test & encode + special % chars',
        limit: 10
      });

      expect(mockTriliumClient.get).toHaveBeenCalledWith(
        'notes?search=test+%26+encode+%2B+special+%25+chars&limit=10'
      );
    });

    test('should properly encode quotes in search query', async () => {
      mockTriliumClient.get.mockResolvedValue({ results: [] });

      await searchNotes(mockTriliumClient, {
        query: '"exact phrase" with quotes',
        limit: 10
      });

      expect(mockTriliumClient.get).toHaveBeenCalledWith(
        'notes?search=%22exact+phrase%22+with+quotes&limit=10'
      );
    });

    test('should properly encode hash symbols for label search', async () => {
      mockTriliumClient.get.mockResolvedValue({ results: [] });

      await searchNotes(mockTriliumClient, {
        query: '#label #tag search',
        limit: 10
      });

      expect(mockTriliumClient.get).toHaveBeenCalledWith(
        'notes?search=%23label+%23tag+search&limit=10'
      );
    });
  });

  describe('edge cases', () => {
    test('should handle very large result sets', async () => {
      // Create mock response with many notes
      const mockResponse = {
        results: Array.from({ length: 50 }, (_, i) => ({
          noteId: `note${i}`,
          title: `Note ${i}`,
          type: 'text',
          dateModified: '2024-01-15T14:30:00.000Z'
        }))
      };

      mockTriliumClient.get.mockResolvedValue(mockResponse);

      const result = await searchNotes(mockTriliumClient, {
        query: 'test',
        limit: 50
      });

      expect(result.content[0].text).toContain('🔍 **Search Results** (50 of 50 max)');
      // Should contain all 50 notes
      for (let i = 0; i < 50; i++) {
        expect(result.content[0].text).toContain(`${i + 1}. **Note ${i}**`);
      }
    });

    test('should handle notes with very long titles', async () => {
      const longTitle = 'A'.repeat(200);
      const mockResponse = {
        results: [
          {
            noteId: 'note123',
            title: longTitle,
            type: 'text'
          }
        ]
      };

      mockTriliumClient.get.mockResolvedValue(mockResponse);

      const result = await searchNotes(mockTriliumClient, {
        query: 'test',
        limit: 10
      });

      expect(result.content[0].text).toContain(`1. **${longTitle}**`);
    });

    test('should handle Unicode characters in search query and results', async () => {
      const mockResponse = {
        results: [
          {
            noteId: 'note123',
            title: '日本語のノート 🌸',
            type: 'text'
          }
        ]
      };

      mockTriliumClient.get.mockResolvedValue(mockResponse);

      const result = await searchNotes(mockTriliumClient, {
        query: '日本語 emoji 🌸',
        limit: 10
      });

      expect(mockTriliumClient.get).toHaveBeenCalledWith(
        'notes?search=%E6%97%A5%E6%9C%AC%E8%AA%9E+emoji+%F0%9F%8C%B8&limit=10'
      );
      expect(result.content[0].text).toContain('1. **日本語のノート 🌸**');
    });
  });
});