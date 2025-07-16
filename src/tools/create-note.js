import { validators, ValidationError } from '../utils/validation.js';
import { TriliumAPIError } from '../utils/trilium-client.js';
import { logger } from '../utils/logger.js';

export async function createNote(triliumClient, args) {
  try {
    // Validate inputs
    const title = validators.title(args.title);
    const content = validators.content(args.content);
    const type = validators.noteType(args.type);
    // TriliumNext API requires parentNoteId - default to 'root' if not provided
    const parentNoteId = args.parentNoteId ? validators.noteId(args.parentNoteId) : 'root';

    logger.debug(`Creating note: title="${title}", type="${type}", parent="${parentNoteId}"`);

    // Prepare note data for TriliumNext API
    const noteData = {
      title,
      content,
      type,
      parentNoteId, // Always required by TriliumNext API
    };

    // Create the note via TriliumNext API
    const result = await triliumClient.post('create-note', noteData);
    
    if (!result || !result.note || !result.note.noteId) {
      throw new TriliumAPIError('Invalid response from TriliumNext API - missing note ID');
    }

    const noteId = result.note.noteId;
    logger.info(`Note created successfully with ID: ${noteId}`);

    // Prepare structured response data
    const creationData = {
      operation: 'create_note',
      timestamp: new Date().toISOString(),
      request: {
        title,
        type,
        contentLength: content.length,
        parentNoteId
      },
      result: {
        noteId,
        ...result.note, // Include any additional data from API response
        triliumUrl: `trilium://note/${noteId}` // Add direct link if useful
      }
    };

    return {
      content: [
        {
          type: 'text',
          text: `Note created: "${title}" (ID: ${noteId})`
        },
        {
          type: 'application/json',
          text: JSON.stringify(creationData, null, 2)
        }
      ],
    };
  } catch (error) {
    logger.error(`Failed to create note: ${error.message}`);
    
    // Create structured error response
    const errorData = {
      operation: 'create_note',
      timestamp: new Date().toISOString(),
      request: {
        title: args.title,
        type: args.type,
        contentLength: args.content?.length,
        parentNoteId: args.parentNoteId
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
          text: `Note creation failed: ${error.message}`
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