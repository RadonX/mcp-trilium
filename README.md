# MCP TriliumNext

A Model Context Protocol (MCP) server for [TriliumNext](https://github.com/TriliumNext/Trilium), providing AI assistants with seamless access to your note-taking workflow.

<a href="https://glama.ai/mcp/servers/@RadonX/mcp-trilium">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@RadonX/mcp-trilium/badge" alt="TriliumNext MCP server" />
</a>

## Overview

This MCP server enables AI assistants like Claude to interact with your TriliumNext notes through a standardized protocol. It provides tools for creating, searching, reading, and updating notes, as well as accessing recent notes as a resource.

## Features

### 🛠️ Tools
- **create_note** - Create new notes with title, content, and type
- **search_notes** - Search notes using fulltext or structured queries
- **get_note** - Retrieve complete note details and content
- **update_note** - Update existing note content

### 📚 Resources
- **trilium://recent-notes** - Access to 10 most recently modified notes

### ✨ Key Capabilities
- Full CRUD operations for notes
- Advanced search with TriliumNext query syntax
- Structured data preservation for AI consumption
- Comprehensive error handling and validation
- Production-ready logging and monitoring

## Installation

### Prerequisites
- Node.js 18.0.0 or higher
- TriliumNext server running and accessible
- ETAPI token from your TriliumNext instance

### Setup

1. **Clone and install**
   ```bash
   git clone git@github.com:RadonX/mcp-trilium.git
   cd mcp-trilium
   npm install
   ```

2. **Configure environment**
   Create a `.env` file with your settings:
   ```env
   TRILIUM_URL=http://localhost:8080
   TRILIUM_AUTH_TOKEN=your_etapi_token_here
   REQUEST_TIMEOUT=30000
   LOG_LEVEL=info
   ```

3. **Get your ETAPI token**
   - Open TriliumNext web interface
   - Go to Options → ETAPI
   - Create a new token or use existing one
   - Copy the token to your `.env` file

4. **Test connectivity**
   ```bash
   npm run test-connectivity
   ```

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "trilium": {
      "command": "node",
      "args": ["/path/to/mcp-trilium/src/index.js"],
      "env": {
        "TRILIUM_URL": "http://localhost:8080",
        "TRILIUM_AUTH_TOKEN": "your_token_here"
      }
    }
  }
}
```

### With MCP Inspector

```bash
npx @modelcontextprotocol/inspector src/index.js
```

### Standalone Usage

```bash
npm start
```

## Examples

### Creating a Note
```javascript
// Ask Claude: "Create a note about TypeScript basics"
{
  "tool": "create_note",
  "arguments": {
    "title": "TypeScript Basics",
    "content": "# TypeScript Fundamentals\n\nTypeScript is a typed superset of JavaScript...",
    "type": "text",
    "parentNoteId": "root"
  }
}
```

### Searching Notes
```javascript
// Ask Claude: "Find all notes about JavaScript"
{
  "tool": "search_notes",
  "arguments": {
    "query": "javascript #programming",
    "limit": 10
  }
}
```

### Updating Content
```javascript
// Ask Claude: "Update my JavaScript notes with new ES6 features"
{
  "tool": "update_note",
  "arguments": {
    "noteId": "note123abc",
    "content": "Updated content with ES6 features..."
  }
}
```

## Search Query Syntax

TriliumNext supports powerful search queries:

- **Fulltext**: `machine learning algorithms`
- **Exact match**: `"neural networks"`
- **Labels**: `#programming #javascript`
- **Combined**: `"react hooks" #programming type:code`
- **Date filters**: `dateCreated:>2024-01-01`

## Development

### Running Tests
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Project Structure
```
src/
├── index.js           # Main MCP server
├── tools/             # MCP tool implementations
│   ├── create-note.js
│   ├── search-notes.js
│   ├── get-note.js
│   └── update-note.js
├── resources/         # MCP resource implementations
│   └── recent-notes.js
└── utils/             # Shared utilities
    ├── trilium-client.js
    ├── validation.js
    └── logger.js
```

### API Reference

#### TriliumNext ETAPI
This server uses TriliumNext's External API (ETAPI). Key endpoints:
- `GET /notes` - Search notes
- `POST /create-note` - Create note
- `GET /notes/{id}` - Get note details
- `PUT /notes/{id}/content` - Update note content

See [docs/trilium-etapi-specification.md](docs/trilium-etapi-specification.md) for complete API documentation.

## Configuration

### Environment Variables
- `TRILIUM_URL` - TriliumNext server URL (default: `http://localhost:8080`)
- `TRILIUM_AUTH_TOKEN` - ETAPI authentication token (required)
- `REQUEST_TIMEOUT` - API request timeout in ms (default: `30000`)
- `LOG_LEVEL` - Logging level: `error`, `warn`, `info`, `debug` (default: `info`)

### Note Types
Supported note types:
- `text` - Rich text notes (default)
- `code` - Code snippets with syntax highlighting
- `file` - File attachments
- `image` - Image notes
- `search` - Saved searches
- `book` - Book/chapter organization
- `relationMap` - Visual relation maps
- `canvas` - Freeform canvas notes

## Troubleshooting

### Common Issues

**Authentication Failed**
```bash
# Check your token
curl -H "Authorization: Bearer your_token" http://localhost:8080/etapi/app-info
```

**Connection Refused**
- Verify TriliumNext is running
- Check `TRILIUM_URL` in `.env`
- Ensure ETAPI is enabled in TriliumNext settings

**Content Stored as [Object]**
- Fixed in v0.1.0 - content now properly sent as text/plain
- Update to latest version if experiencing this issue

### Debug Mode
```bash
LOG_LEVEL=debug npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes with tests
4. Run the test suite: `npm test`
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Projects

- [TriliumNext](https://github.com/TriliumNext/Trilium) - The note-taking application
- [Model Context Protocol](https://github.com/modelcontextprotocol/servers) - MCP specification
- [Claude Desktop](https://claude.ai/desktop) - AI assistant with MCP support

## Future Enhancements

The following features may be added in future versions:

### 🚀 Planned Features
- **Enhanced note types support** - Full support for all TriliumNext note types (relationMap, canvas, etc.)
- **Advanced search features** - Attribute-based queries, date range filters, and complex search operators
- **Performance optimizations** - Caching, batch operations, and streaming for large note collections
- **Note relationship management** - Tools for managing note relationships and hierarchies
- **Bulk operations** - Create, update, or delete multiple notes in a single operation
- **Attachment handling** - Support for file uploads and downloads
- **Real-time updates** - WebSocket integration for live note synchronization

### 💡 Potential Integrations
- **Export capabilities** - Export notes to various formats (Markdown, PDF, etc.)
- **Template system** - Predefined note templates for common use cases
- **Backup and restore** - Automated backup functionality through MCP
- **Analytics and insights** - Note usage statistics and content analysis

## Changelog

### v0.1.0
- Initial release with full CRUD operations
- MCP resource for recent notes
- Comprehensive test coverage (94 tests)
- Production-ready error handling and validation

---

Made with ❤️ for the TriliumNext and MCP communities