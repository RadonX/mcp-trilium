#!/usr/bin/env node

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { logger } from './utils/logger.js';
import { TriliumClient, TriliumAPIError } from './utils/trilium-client.js';
import { ValidationError } from './utils/validation.js';
import { createNote } from './tools/create-note.js';
import { searchNotes } from './tools/search-notes.js';
import { getNote } from './tools/get-note.js';
import { updateNote } from './tools/update-note.js';
import { getRecentNotesResource } from './resources/recent-notes.js';

class TriliumMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'mcp-triliumnext',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.triliumClient = new TriliumClient();
    
    this.setupHandlers();
    logger.info('TriliumMCP Server initialized');
  }

  setupHandlers() {
    this.setupToolHandlers();
    this.setupResourceHandlers();
    this.setupErrorHandling();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('Listing available tools');
      return {
        tools: [
          {
            name: 'create_note',
            description: 'Create a new note in TriliumNext',
            inputSchema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'The title of the note (max 200 characters)',
                },
                content: {
                  type: 'string',
                  description: 'The content of the note (max 1MB)',
                },
                type: {
                  type: 'string',
                  enum: ['text', 'code', 'file', 'image', 'search', 'book', 'relationMap', 'canvas'],
                  default: 'text',
                  description: 'The type of note to create',
                },
                parentNoteId: {
                  type: 'string',
                  description: 'ID of the parent note (defaults to "root" if not provided)',
                },
              },
              required: ['title', 'content'],
            },
          },
          {
            name: 'search_notes',
            description: 'Search for notes in TriliumNext',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query (fulltext or structured, max 500 characters)',
                },
                limit: {
                  type: 'number',
                  minimum: 1,
                  maximum: 100,
                  default: 10,
                  description: 'Maximum number of results to return',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_note',
            description: 'Get details of a specific note',
            inputSchema: {
              type: 'object',
              properties: {
                noteId: {
                  type: 'string',
                  description: 'The ID of the note to retrieve',
                },
              },
              required: ['noteId'],
            },
          },
          {
            name: 'update_note',
            description: 'Update the content of an existing note',
            inputSchema: {
              type: 'object',
              properties: {
                noteId: {
                  type: 'string',
                  description: 'The ID of the note to update',
                },
                content: {
                  type: 'string',
                  description: 'The new content for the note (max 1MB)',
                },
              },
              required: ['noteId', 'content'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        logger.info(`Executing tool: ${request.params.name}`);
        
        switch (request.params.name) {
          case 'create_note':
            return await this.createNote(request.params.arguments);
          case 'search_notes':
            return await this.searchNotes(request.params.arguments);
          case 'get_note':
            return await this.getNote(request.params.arguments);
          case 'update_note':
            return await this.updateNote(request.params.arguments);
          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        logger.error(`Tool execution failed: ${error.message}`);
        throw error;
      }
    });
  }

  setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      logger.debug('Listing available resources');
      return {
        resources: [
          {
            uri: 'trilium://recent-notes',
            name: 'Recent Notes',
            description: 'Recently modified notes in TriliumNext',
            mimeType: 'application/json',
          },
        ],
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      logger.info(`Reading resource: ${request.params.uri}`);
      
      const uri = request.params.uri;
      
      if (uri === 'trilium://recent-notes') {
        return await this.getRecentNotesResource();
      }
      
      throw new Error(`Unknown resource: ${uri}`);
    });
  }

  setupErrorHandling() {
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      process.exit(1);
    });
  }

  async createNote(args) {
    return await createNote(this.triliumClient, args);
  }

  async searchNotes(args) {
    return await searchNotes(this.triliumClient, args);
  }

  async getNote(args) {
    return await getNote(this.triliumClient, args);
  }

  async updateNote(args) {
    return await updateNote(this.triliumClient, args);
  }

  async getRecentNotesResource() {
    return await getRecentNotesResource(this.triliumClient);
  }

  async run() {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      logger.info('TriliumNext MCP server running on stdio');
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new TriliumMCPServer();
server.run().catch((error) => {
  logger.error('Server startup failed:', error);
  process.exit(1);
});