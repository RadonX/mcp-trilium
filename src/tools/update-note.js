import { validators, ValidationError } from '../utils/validation.js';
import { TriliumAPIError } from '../utils/trilium-client.js';
import { logger } from '../utils/logger.js';

export async function updateNote(triliumClient, args) {
  try {
    // Validate inputs
    const noteId = validators.noteId(args.noteId);
    const content = validators.content(args.content);

    logger.debug(`Updating note: noteId="${noteId}"`);

    // First, check if the note exists by getting its metadata
    try {
      const note = await triliumClient.get(`notes/${noteId}`);
      if (!note) {
        throw new TriliumAPIError('Note not found', 404);
      }
      logger.debug(`Note exists: ${note.title || 'Untitled'}`);
    } catch (error) {
      if (error instanceof TriliumAPIError && error.status === 404) {
        throw new TriliumAPIError('Note not found', 404);
      }
      throw error;
    }

    // Update the note content via TriliumNext API
    // TriliumNext API expects raw content string, not JSON object
    await triliumClient.putRaw(`notes/${noteId}/content`, content);
    
    logger.info(`Note content updated successfully: ${noteId}`);

    // Get updated note info for confirmation
    const updatedNote = await triliumClient.get(`notes/${noteId}`);

    // Prepare structured response data
    const updateData = {
      operation: 'update_note',
      timestamp: new Date().toISOString(),
      request: {
        noteId,
        contentLength: content.length
      },
      result: {
        noteId,
        title: updatedNote.title || 'Untitled',
        type: updatedNote.type || 'text',
        dateModified: updatedNote.dateModified,
        contentLength: content.length,
        ...updatedNote, // Include any additional data from API response
        triliumUrl: `trilium://note/${noteId}`
      }
    };

    return {
      content: [
        {
          type: 'text',
          text: `Note updated: "${updatedNote.title || 'Untitled'}" (ID: ${noteId})`
        },
        {
          type: 'application/json',
          text: JSON.stringify(updateData, null, 2)
        }
      ],
    };
  } catch (error) {
    logger.error(`Failed to update note: ${error.message}`);
    
    // Create structured error response
    const errorData = {
      operation: 'update_note',
      timestamp: new Date().toISOString(),
      request: {
        noteId: args.noteId,
        contentLength: args.content?.length
      },
      error: {
        type: error.constructor.name,
        message: error.message,
        ...(error instanceof TriliumAPIError && { status: error.status }),
        ...(error instanceof TriliumAPIError && error.details && { details: error.details })
      }
    };
    
    if (error instanceof ValidationError) {
      return {
        content: [
          {
            type: 'text',
            text: `Validation error: ${error.message}`
          },
          {
            type: 'application/json',
            text: JSON.stringify(errorData, null, 2)
          }
        ],
        isError: true,
      };
    }
    
    if (error instanceof TriliumAPIError) {
      if (error.status === 404) {
        return {
          content: [
            {
              type: 'text',
              text: `Note not found: ${args.noteId}`
            },
            {
              type: 'application/json',
              text: JSON.stringify(errorData, null, 2)
            }
          ],
          isError: true,
        };
      } else if (error.status === 403) {
        return {
          content: [
            {
              type: 'text',
              text: `Access denied: Cannot update note ${args.noteId}`
            },
            {
              type: 'application/json',
              text: JSON.stringify(errorData, null, 2)
            }
          ],
          isError: true,
        };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `TriliumNext API error: ${error.message}`
          },
          {
            type: 'application/json',
            text: JSON.stringify(errorData, null, 2)
          }
        ],
        isError: true,
      };
    }
    
    // Unknown error
    return {
      content: [
        {
          type: 'text',
          text: `Failed to update note: ${error.message}`
        },
        {
          type: 'application/json',
          text: JSON.stringify(errorData, null, 2)
        }
      ],
      isError: true,
    };
  }
}