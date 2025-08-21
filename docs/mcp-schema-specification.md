# TriliumNext MCP Server Schema Documentation

## Server Information

```json
{
  "name": "mcp-triliumnext",
  "version": "1.0.0",
  "description": "MCP server for TriliumNext note-taking application",
  "capabilities": {
    "tools": {},
    "resources": {}
  }
}
```

## Tools

### 1. `note` - Note Modifications

**Purpose**: Create, update, or delete notes with their metadata (labels and relations).

```json
{
  "name": "note",
  "description": "Create, update, or delete notes with metadata",
  "inputSchema": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["create", "update", "delete"],
        "description": "Operation to perform on the note"
      },
      "noteId": {
        "type": "string",
        "description": "Note ID - required for update and delete operations"
      },
      "parentId": {
        "type": "string",
        "description": "Parent note ID for create operation (defaults to 'root')"
      },
      "title": {
        "type": "string",
        "description": "Note title"
      },
      "content": {
        "type": "string",
        "description": "Note content (supports markdown and HTML)"
      },
      "type": {
        "type": "string",
        "enum": ["text", "code", "file", "image", "search", "book", "relationMap", "canvas"],
        "default": "text",
        "description": "Note type determining display and behavior"
      },
      "labels": {
        "type": "object",
        "description": "Key-value pairs for note labels (e.g., {'priority': 'high', 'project': 'myapp'})",
        "additionalProperties": {"type": "string"}
      },
      "relations": {
        "type": "object",
        "description": "Key-noteId pairs for note relations (e.g., {'dependsOn': 'note123', 'relatedTo': 'note456'})",
        "additionalProperties": {"type": "string"}
      },
      "position": {
        "type": "number",
        "description": "Position among siblings (0 for first position)"
      }
    },
    "required": ["action"],
    "additionalProperties": false
  }
}
```

**Response Schema**:
```json
{
  "type": "object",
  "properties": {
    "content": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": {"type": "string", "enum": ["text"]},
          "text": {"type": "string"}
        }
      }
    }
  }
}
```

**Usage Examples**:
```javascript
// Create a new note
{
  "action": "create",
  "title": "Python Best Practices",
  "content": "# Python Guidelines\n\n1. Use meaningful variable names...",
  "type": "text",
  "labels": {
    "language": "python",
    "level": "intermediate",
    "category": "programming"
  },
  "relations": {
    "dependsOn": "python-basics-note-id",
    "relatedTo": "coding-standards-note-id"
  }
}

// Update existing note
{
  "action": "update",
  "noteId": "abc123",
  "content": "Updated content...",
  "labels": {
    "status": "reviewed"
  }
}

// Delete note
{
  "action": "delete",
  "noteId": "abc123"
}
```

### 2. `find` - Note Retrieval

**Purpose**: Search for multiple notes or retrieve a specific note by ID.

```json
{
  "name": "find",
  "description": "Search for notes or retrieve specific note content",
  "inputSchema": {
    "type": "object",
    "properties": {
      "noteId": {
        "type": "string",
        "description": "Get specific note by ID (mutually exclusive with query)"
      },
      "query": {
        "type": "string",
        "description": "Search query supporting: fulltext, labels (#label), relations (~relation), field filters (type:code, dateCreated:>2023-01-01)"
      },
      "limit": {
        "type": "number",
        "minimum": 1,
        "maximum": 100,
        "default": 10,
        "description": "Maximum number of search results"
      },
      "ancestorNoteId": {
        "type": "string",
        "description": "Limit search to subtree under this note"
      },
      "orderBy": {
        "type": "string",
        "enum": ["title", "dateModified", "dateCreated"],
        "default": "dateModified",
        "description": "Field to sort results by"
      },
      "orderDirection": {
        "type": "string",
        "enum": ["asc", "desc"],
        "default": "desc",
        "description": "Sort direction"
      },
      "includeArchived": {
        "type": "boolean",
        "default": false,
        "description": "Include archived notes in results"
      }
    },
    "additionalProperties": false
  }
}
```

**Query Syntax**:
- **Fulltext**: `machine learning algorithms`
- **Exact match**: `"neural networks"`
- **Labels**: `#programming #python`
- **Relations**: `~dependsOn ~relatedTo`
- **Type filter**: `type:code`
- **Date filter**: `dateCreated:>2023-01-01`
- **Combined**: `"react hooks" #programming type:code dateModified:>2023-12-01`

**Usage Examples**:
```javascript
// Get specific note
{"noteId": "abc123"}

// Search by content
{"query": "machine learning python"}

// Search by labels
{"query": "#programming #tutorial"}

// Complex search
{
  "query": "\"best practices\" #python type:text dateCreated:>2023-01-01",
  "limit": 20,
  "orderBy": "dateModified"
}

// Search within subtree
{
  "query": "#important",
  "ancestorNoteId": "programming-notes-id",
  "limit": 5
}
```

### 3. `tree` - Hierarchy Management

**Purpose**: Navigate note tree structure and modify note placement.

```json
{
  "name": "tree",
  "description": "Navigate and modify note tree structure",
  "inputSchema": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["get", "move", "clone"],
        "description": "Tree operation to perform"
      },
      "noteId": {
        "type": "string",
        "description": "Target note ID"
      },
      "parentId": {
        "type": "string",
        "description": "New parent note ID (required for move and clone)"
      },
      "position": {
        "type": "number",
        "description": "Position among siblings (0 for first position)"
      },
      "depth": {
        "type": "number",
        "minimum": 1,
        "maximum": 10,
        "default": 3,
        "description": "Maximum tree depth for get operation"
      },
      "includeArchived": {
        "type": "boolean",
        "default": false,
        "description": "Include archived notes in tree"
      }
    },
    "required": ["action", "noteId"],
    "additionalProperties": false
  }
}
```

**Usage Examples**:
```javascript
// Get tree structure
{
  "action": "get",
  "noteId": "root",
  "depth": 2
}

// Move note to new parent
{
  "action": "move",
  "noteId": "note-to-move",
  "parentId": "new-parent-id",
  "position": 0
}

// Clone note to another location
{
  "action": "clone",
  "noteId": "note-to-clone", 
  "parentId": "target-parent-id"
}
```

### 4. `attach` - File Attachments

**Purpose**: Manage file attachments for notes.

```json
{
  "name": "attach",
  "description": "Handle file attachments for notes",
  "inputSchema": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["upload", "list", "download", "delete"],
        "description": "File operation to perform"
      },
      "noteId": {
        "type": "string",
        "description": "Note ID (required for upload and list operations)"
      },
      "attachmentId": {
        "type": "string",
        "description": "Attachment ID (required for download and delete operations)"
      },
      "filename": {
        "type": "string",
        "description": "Filename with extension (required for upload)"
      },
      "content": {
        "type": "string",
        "description": "Base64-encoded file content (required for upload)"
      },
      "mimeType": {
        "type": "string",
        "description": "MIME type (required for upload, e.g., 'image/png', 'application/pdf')"
      },
      "title": {
        "type": "string",
        "description": "Optional display title for attachment"
      }
    },
    "required": ["action"],
    "additionalProperties": false
  }
}
```

**Usage Examples**:
```javascript
// Upload file
{
  "action": "upload",
  "noteId": "abc123",
  "filename": "diagram.png", 
  "content": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  "mimeType": "image/png",
  "title": "System Architecture Diagram"
}

// List attachments
{
  "action": "list",
  "noteId": "abc123"
}

// Download attachment
{
  "action": "download",
  "attachmentId": "attachment-id-123"
}

// Delete attachment
{
  "action": "delete", 
  "attachmentId": "attachment-id-123"
}
```

## Resources

### 1. `trilium://recent-notes`

**Purpose**: Provides recently modified notes for context.

```json
{
  "uri": "trilium://recent-notes",
  "name": "Recent Notes",
  "description": "Recently modified notes in TriliumNext",
  "mimeType": "application/json"
}
```

**Response Format**:
```json
{
  "notes": [
    {
      "noteId": "string",
      "title": "string",
      "type": "string",
      "dateCreated": "string (ISO datetime)",
      "dateModified": "string (ISO datetime)",
      "parentNoteIds": ["string"],
      "isProtected": "boolean",
      "mime": "string",
      "attributes": []
    }
  ],
  "timestamp": "string (ISO datetime)",
  "count": "number",
  "description": "string"
}
```

### 2. `trilium://system-info`

**Purpose**: Provides TriliumNext application information and status.

```json
{
  "uri": "trilium://system-info",
  "name": "System Information",
  "description": "TriliumNext application status and configuration",
  "mimeType": "application/json"
}
```

**Response Format**:
```json
{
  "appVersion": "string",
  "dbVersion": "string",
  "syncVersion": "string",
  "buildDate": "string",
  "buildRevision": "string",
  "dataDirectory": "string",
  "clipperProtocolVersion": "string",
  "utcDateTime": "string"
}
```

## Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "string",
    "message": "string", 
    "details": "object (optional)"
  }
}
```

### Common Error Codes
- `INVALID_REQUEST` - Malformed request or missing required parameters
- `NOT_FOUND` - Requested note, attachment, or resource not found
- `UNAUTHORIZED` - Authentication failed or insufficient permissions
- `VALIDATION_ERROR` - Input validation failed
- `API_ERROR` - TriliumNext API returned an error
- `INTERNAL_ERROR` - Server internal error

### Validation Rules

**Note Operations**:
- `title`: Max 200 characters
- `content`: Max 1MB
- `noteId`: Must be valid note identifier
- `parentId`: Must exist and not create circular reference

**Search Operations**:
- `query`: Max 500 characters
- `limit`: Between 1 and 100

**File Operations**:
- `filename`: Must include valid extension
- `content`: Must be valid base64
- `mimeType`: Must be valid MIME type

## Authentication

The MCP server requires these environment variables:

```bash
TRILIUM_URL=http://localhost:8080
TRILIUM_AUTH_TOKEN=your_etapi_token_here
REQUEST_TIMEOUT=30000
LOG_LEVEL=info
```

## Backward Compatibility

This schema maintains backward compatibility by:
- Supporting all existing note operations
- Enhancing search capabilities without breaking existing queries
- Providing unified interfaces that can handle legacy workflows
- Preserving all data integrity constraints

## Implementation Notes

- All timestamps are in ISO 8601 format
- File content must be base64-encoded for upload operations
- Tree operations preserve note relationships and hierarchy integrity
- Label and relation operations are atomic with note modifications
- Search queries support TriliumNext's full query syntax including boolean operators