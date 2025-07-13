import { validators, ValidationError } from '../utils/validation.js';
import { TriliumAPIError } from '../utils/trilium-client.js';
import { logger } from '../utils/logger.js';

export async function searchNotes(triliumClient, args) {
  try {
    // Validate inputs
    const query = validators.searchQuery(args.query);
    const limit = validators.limit(args.limit);

    logger.debug(`Searching notes: query="${query}", limit=${limit}`);

    // Prepare search parameters for TriliumNext API
    const params = new URLSearchParams({
      search: query,
      limit: limit.toString(),
    });

    // Search notes via TriliumNext API
    const response = await triliumClient.get(`notes?${params}`);
    
    if (!response || typeof response !== 'object' || !Array.isArray(response.results)) {
      throw new TriliumAPIError('Invalid response from TriliumNext API - expected object with results array');
    }
    
    const results = response.results;
    logger.info(`Found ${results.length} notes matching query "${query}"`);

    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `🔍 **No notes found**

Your search for "${query}" didn't return any results.

**Suggestions:**
- Try using different keywords
- Check for typos in your search query
- Use broader search terms
- Try searching for partial words`,
          },
        ],
      };
    }

    // Format results for display
    const formattedResults = results.map((note, index) => {
      const noteInfo = [
        `${index + 1}. **${note.title || 'Untitled'}**`,
        `   - ID: \`${note.noteId}\``,
        `   - Type: ${note.type || 'text'}`,
      ];
      
      if (note.dateModified) {
        noteInfo.push(`   - Modified: ${new Date(note.dateModified).toLocaleString()}`);
      }
      
      if (note.parentNoteId) {
        noteInfo.push(`   - Parent: ${note.parentNoteId}`);
      }
      
      return noteInfo.join('\n');
    }).join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `🔍 **Search Results** (${results.length} of ${limit} max)

**Query:** "${query}"

${formattedResults}

💡 **Tip:** Use the \`get_note\` tool with a note ID to view full content.`,
        },
      ],
    };
  } catch (error) {
    logger.error(`Failed to search notes: ${error.message}`);
    
    if (error instanceof ValidationError) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Validation Error:** ${error.message}

Please check your search query and try again.`,
          },
        ],
        isError: true,
      };
    }
    
    if (error instanceof TriliumAPIError) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **TriliumNext API Error:** ${error.message}

Status: ${error.status || 'Unknown'}
Please check your TriliumNext connection and authentication.`,
          },
        ],
        isError: true,
      };
    }
    
    // Unknown error
    return {
      content: [
        {
          type: 'text',
          text: `❌ **Unexpected Error:** ${error.message}

Please try again or check the server logs for more details.`,
        },
      ],
      isError: true,
    };
  }
}