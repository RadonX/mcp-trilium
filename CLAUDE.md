# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server for TriliumNext, a note-taking application. The server provides AI assistants with standardized tools and resources to interact with TriliumNext notes.

**Project Goal**: Write an MCP server for TriliumNext that enables AI assistants to seamlessly create, search, read, and update notes.

## Key References

- **TriliumNext ETAPI**: 
  - http://TRILIUM_URL/etapi/etapi.openapi.yaml
  - or https://raw.githubusercontent.com/TriliumNext/Trilium/15c2f56bf22bd3a7f59540bb7a2ca6eabe726eca/apps/server/src/assets/etapi.openapi.yaml
- **MCP Documentation**: See `docs/mcp_tutorials.md` for comprehensive MCP implementation guidance
- **Local Documentation**: The `docs/` directory contains project-specific documentation that can be updated as needed:
  - `docs/trilium-etapi-specification.md` - TriliumNext API documentation
  - `docs/mcp-fundamentals.md` - MCP protocol fundamentals
  - `docs/implementation-plan.md` - Original implementation plan

## Common Development Commands

```bash
# Start development server with file watching
npm run dev

# Run the server normally
npm start

# Test connectivity to TriliumNext
npm run test-connectivity

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage report
npm run test:coverage
```

## Environment Configuration

The server requires these environment variables (create `.env` file):

```env
TRILIUM_URL=http://localhost:8080
TRILIUM_AUTH_TOKEN=your_etapi_token_here
REQUEST_TIMEOUT=30000
LOG_LEVEL=info
```

## Architecture

### Core Components

- **TriliumMCPServer** (`src/index.js`) - Main server class that implements MCP protocol
- **TriliumClient** (`src/utils/trilium-client.js`) - HTTP client wrapper for TriliumNext ETAPI
- **Tools** (`src/tools/`) - Individual MCP tool implementations (create-note, search-notes, get-note, update-note)
- **Resources** (`src/resources/`) - MCP resource implementations (recent-notes)
- **Utils** (`src/utils/`) - Shared utilities (logger, validation, client)

### Key Design Patterns

- **Modular tool architecture** - Each MCP tool is in its own file with consistent error handling
- **Centralized client** - Single TriliumClient instance handles all API communication with interceptors
- **Validation layer** - Input validation using utils/validation.js before API calls
- **Structured error handling** - Custom TriliumAPIError class with HTTP status mapping
- **Comprehensive logging** - Debug, info, warn, error levels with structured output

### MCP Protocol Implementation

The server implements:
- **4 Tools**: create_note, search_notes, get_note, update_note
- **1 Resource**: trilium://recent-notes (10 most recent notes)
- **Full MCP compliance**: Uses @modelcontextprotocol/sdk with proper request/response schemas

### API Integration

- Uses TriliumNext External API (ETAPI) via HTTP REST
- Bearer token authentication
- Handles all standard HTTP error codes (401, 403, 404, 5xx)
- Content-Type handling for both JSON and text/plain (note content updates)

## Testing

- **Jest** with Babel for ES6 modules
- **94% test coverage** across all tools and utilities
- Test files mirror source structure in `tests/` directory
- Mock TriliumClient for unit tests
- Integration test setup via `scripts/test-connectivity.js`

## Key Implementation Details

### Note Content Handling
- Content is sent as `text/plain` for updates to prevent `[Object]` storage
- Supports all TriliumNext note types (text, code, file, image, search, book, relationMap, canvas)
- Parent note ID defaults to 'root' if not specified

### Search Query Support
- Fulltext search: `machine learning`
- Exact match: `"neural networks"`
- Labels: `#programming #javascript`
- Combined queries: `"react hooks" #programming type:code`
- Date filters: `dateCreated:>2024-01-01`

### Error Handling Strategy
- ValidationError for input validation failures
- TriliumAPIError for API communication issues
- Proper MCP error response formatting
- Detailed logging for debugging

## Development Notes

- Uses ES6 modules (`"type": "module"` in package.json)
- Node.js 18.0.0+ required
- Axios for HTTP client with interceptors
- Winston-style logging via custom logger
- Environment variable configuration with dotenv