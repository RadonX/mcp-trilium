# ETAPI ↔ MCP Schema Mapping Cheatsheet

## Quick Reference

| **Operation** | **ETAPI Endpoint** | **MCP Tool** | **Action** |
|---------------|-------------------|--------------|------------|
| Create Note | `POST /create-note` | `note` | `create` |
| Get Note | `GET /notes/{noteId}` | `find` | `noteId="123"` |
| Update Note | `PATCH /notes/{noteId}` | `note` | `update` |
| Delete Note | `DELETE /notes/{noteId}` | `note` | `delete` |
| Search Notes | `GET /notes?search=...` | `find` | `query="..."` |
| Get Tree | Multiple branch calls | `tree` | `get` |
| Move Note | `POST /branches` + `DELETE` | `tree` | `move` |
| Clone Note | `POST /branches` | `tree` | `clone` |
| Upload File | `POST /attachments` | `attach` | `upload` |
| List Files | `GET /notes/{id}/attachments` | `attach` | `list` |

## Detailed Mappings

### Note Operations

#### Create Note
```bash
# ETAPI
POST /create-note
{
  "noteId": "new123",
  "title": "My Note",
  "content": "Content here",
  "type": "text",
  "parentNoteId": "parent123"
}

# MCP
note({
  "action": "create",
  "title": "My Note", 
  "content": "Content here",
  "type": "text",
  "parentId": "parent123"
})
```

#### Get Note Content
```bash
# ETAPI
GET /notes/abc123
GET /notes/abc123/content

# MCP  
find({"noteId": "abc123"})
```

#### Update Note
```bash
# ETAPI
PATCH /notes/abc123
PUT /notes/abc123/content

# MCP
note({
  "action": "update",
  "noteId": "abc123",
  "title": "Updated Title",
  "content": "Updated content"
})
```

#### Delete Note
```bash
# ETAPI
DELETE /notes/abc123

# MCP
note({
  "action": "delete", 
  "noteId": "abc123"
})
```

### Search Operations

#### Basic Search
```bash
# ETAPI
GET /notes?search=python programming&limit=10

# MCP
find({
  "query": "python programming",
  "limit": 10
})
```

#### Advanced Search with Labels
```bash
# ETAPI
GET /notes?search=#programming type:code&orderBy=dateModified&orderDirection=desc

# MCP
find({
  "query": "#programming type:code",
  "orderBy": "dateModified",
  "orderDirection": "desc"
})
```

#### Search in Subtree
```bash
# ETAPI
GET /notes?search=tutorial&ancestorNoteId=programming123

# MCP  
find({
  "query": "tutorial",
  "ancestorNoteId": "programming123"
})
```

### Attribute Management

#### ETAPI - Multiple Calls Required
```bash
# Get attributes
GET /notes/abc123/attributes

# Add label
POST /attributes
{
  "noteId": "abc123",
  "type": "label", 
  "name": "priority",
  "value": "high"
}

# Add relation
POST /attributes
{
  "noteId": "abc123",
  "type": "relation",
  "name": "dependsOn", 
  "value": "xyz789"
}

# Update attribute
PUT /attributes/attr123
{"value": "medium"}

# Delete attribute  
DELETE /attributes/attr123
```

#### MCP - Unified in Note Operations
```bash
# Create note with attributes
note({
  "action": "create",
  "title": "My Note",
  "labels": {
    "priority": "high",
    "category": "work"
  },
  "relations": {
    "dependsOn": "xyz789",
    "relatedTo": "abc456"
  }
})

# Update note attributes
note({
  "action": "update", 
  "noteId": "abc123",
  "labels": {
    "priority": "medium",
    "status": "completed"
  }
})
```

### Hierarchy Operations

#### Get Tree Structure
```bash
# ETAPI - Complex branch traversal
GET /branches/{branchId}
# Multiple recursive calls needed

# MCP - Simple tree operation
tree({
  "action": "get",
  "noteId": "root",
  "depth": 3
})
```

#### Move Note
```bash
# ETAPI - Branch manipulation
POST /branches
{
  "noteId": "note123",
  "parentNoteId": "newParent456", 
  "notePosition": 0
}
DELETE /branches/{oldBranchId}

# MCP - Direct move operation
tree({
  "action": "move",
  "noteId": "note123",
  "parentId": "newParent456",
  "position": 0
})
```

#### Clone Note
```bash
# ETAPI - Create additional branch
POST /branches
{
  "noteId": "note123",
  "parentNoteId": "targetParent789"
}

# MCP - Direct clone operation  
tree({
  "action": "clone",
  "noteId": "note123", 
  "parentId": "targetParent789"
})
```

### File Attachments

#### Upload File
```bash
# ETAPI
POST /attachments
{
  "ownerId": "note123",
  "role": "file",
  "mime": "image/png",
  "title": "diagram.png"
}
PUT /attachments/{attachmentId}/content
# Binary content

# MCP
attach({
  "action": "upload",
  "noteId": "note123",
  "filename": "diagram.png",
  "content": "base64EncodedContent...",
  "mimeType": "image/png"
})
```

#### List Attachments
```bash
# ETAPI
GET /notes/note123/attachments

# MCP
attach({
  "action": "list",
  "noteId": "note123"
})
```

#### Download File
```bash
# ETAPI
GET /attachments/attach456/content

# MCP
attach({
  "action": "download", 
  "attachmentId": "attach456"
})
```

### Calendar Integration

#### ETAPI Calendar Endpoints
```bash
# ETAPI - Separate endpoints
GET /calendar/days/2023-12-25
GET /calendar/weeks/2023-12-25  
GET /calendar/months/2023-12
GET /calendar/years/2023
GET /inbox/2023-12-25

# MCP - Not implemented (considered non-core functionality)
# Use regular note operations with calendar-based organization
```

### System Operations

#### Application Info
```bash
# ETAPI
GET /app-info

# MCP Resource
trilium://system-info
```

#### Backup Operations
```bash
# ETAPI
POST /backup

# MCP - Not implemented (system administration, not note management)
```

## Key Differences

### ETAPI → MCP Simplifications

| **ETAPI Approach** | **MCP Approach** | **Benefit** |
|-------------------|------------------|-------------|
| Separate attribute endpoints | Attributes in note operations | Atomic operations |
| Branch management complexity | Simple tree operations | User-friendly mental model |
| Multiple calls for note+metadata | Single unified call | Reduced API surface |
| Calendar-specific endpoints | Regular note organization | Core functionality focus |
| Backup/admin endpoints | Excluded | Clear scope boundaries |

### MCP Design Principles

1. **Unified Operations**: Combine related ETAPI calls into single MCP tools
2. **User Mental Model**: Operations match how users think about notes
3. **Atomic Actions**: Complete operations in single calls
4. **Core Focus**: Essential note management, exclude admin/system functions
5. **Simplified Interface**: 4 intuitive tools vs 20+ ETAPI endpoints

### Migration Strategy

**From ETAPI to MCP**:
- Replace multiple ETAPI calls with single MCP tool calls
- Combine note+attribute operations into unified `note` tool
- Use `find` for both search and retrieval
- Simplify hierarchy operations with `tree` tool
- Streamline file operations with `attach` tool

**Benefits of MCP Design**:
- **78% fewer tools** (4 vs 18 potential)
- **Atomic operations** reduce error scenarios
- **Intuitive naming** improves developer experience  
- **Unified interfaces** eliminate edge cases
- **Focus on core workflows** improves usability