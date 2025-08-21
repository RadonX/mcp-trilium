# TriliumNext ETAPI Specification Notes

## Overview
TriliumNext External API (ETAPI) is a comprehensive REST API for programmatic interaction with the TriliumNext note-taking application. The API provides full CRUD operations for notes, branches, attributes, attachments, and more.

## Authentication

### Methods
1. **Token Authentication (EtapiTokenAuth)**
   - Header: `Authorization: <token>`
   - Preferred method for API access

2. **Basic Authentication (EtapiBasicAuth)**
   - Uses ETAPI token as credentials
   - Format: `Authorization: Basic <base64(username:etapi_token)>`

### Authentication Flow
```
POST /auth/login
{
  "password": "your_password"
}
→ Returns: { "authToken": "..." }

Use token in subsequent requests:
Authorization: <authToken>

POST /auth/logout (optional)
→ Invalidates the token
```

## Core Data Models

### Note Object
```yaml
Note:
  noteId: string (unique identifier)
  title: string
  type: string (text|code|file|image|search|book|relationMap|canvas)
  mime: string (MIME type)
  isProtected: boolean
  isDeleted: boolean
  dateCreated: string (ISO datetime)
  dateModified: string (ISO datetime)
  utcDateCreated: string (ISO datetime)
  utcDateModified: string (ISO datetime)
  parentNoteId: string
  content: string (note content)
  contentLength: integer
```

### Branch Object
```yaml
Branch:
  branchId: string
  noteId: string
  parentNoteId: string
  prefix: string
  notePosition: integer
  isExpanded: boolean
  utcDateCreated: string
  utcDateModified: string
```

### Attribute Object
```yaml
Attribute:
  attributeId: string
  noteId: string
  type: string (label|relation)
  name: string
  value: string
  position: integer
  utcDateCreated: string
  utcDateModified: string
```

### Attachment Object
```yaml
Attachment:
  attachmentId: string
  ownerId: string
  role: string
  mime: string
  title: string
  isDeleted: boolean
  utcDateCreated: string
  utcDateModified: string
  contentLength: integer
```

## API Endpoints

### Notes
- `GET /notes` - Search notes with advanced filtering
- `POST /create-note` - Create new note
- `GET /notes/{noteId}` - Get note details
- `PATCH /notes/{noteId}` - Update note metadata (changed from PUT)
- `DELETE /notes/{noteId}` - Delete note
- `GET /notes/{noteId}/content` - Get note content
- `PUT /notes/{noteId}/content` - Update note content
- `POST /notes/{noteId}/revision` - Create note revision

### Search Parameters (GET /notes)
```yaml
search: string (required) - Search query
  - Supports fulltext search
  - Exact match with quotes: "exact phrase"
  - Label search: #labelName
  - Combined: "search term" #label

fastSearch: boolean - Enable quick search
includeArchivedNotes: boolean - Include archived notes
ancestorNoteId: string - Limit to subtree
ancestorDepth: string - Search depth examples:
  - "eq1" - exactly depth 1 (direct children)
  - "eq3" - exactly depth 3  
  - "lt4" - less than depth 4 (1, 2, 3)
  - "gt2" - greater than depth 2 (3, 4, 5...)

orderBy: string - Sort field options:
  - title, dateCreated, dateModified, utcDateCreated, utcDateModified
  - isProtected, isArchived, parentCount, childrenCount
  - attributeCount, labelCount, relationCount, contentSize
  - revisionCount, contentAndAttachmentsSize

orderDirection: string - "asc" or "desc"
limit: integer - Max results
debug: boolean - Include query parsing info
```

### Branches
- `GET /branches/{branchId}` - Get branch details
- `POST /branches` - Create new branch
- `PUT /branches/{branchId}` - Update branch
- `DELETE /branches/{branchId}` - Delete branch
- `POST /refresh-note-ordering/{parentNoteId}` - Refresh ordering

### Attributes
- `GET /notes/{noteId}/attributes` - Get note attributes
- `POST /attributes` - Create attribute
- `PUT /attributes/{attributeId}` - Update attribute
- `DELETE /attributes/{attributeId}` - Delete attribute

### Attachments
- `GET /notes/{noteId}/attachments` - Get note attachments
- `POST /attachments` - Create attachment
- `GET /attachments/{attachmentId}` - Get attachment details
- `PUT /attachments/{attachmentId}` - Update attachment
- `DELETE /attachments/{attachmentId}` - Delete attachment
- `GET /attachments/{attachmentId}/content` - Get attachment content
- `PUT /attachments/{attachmentId}/content` - Update attachment content

### Calendar Integration
- `GET /calendar/days/{date}` - Get/create day note for specific date
- `GET /calendar/weeks/{date}` - Get/create week note for date
- `GET /calendar/months/{month}` - Get/create month note
- `GET /calendar/years/{year}` - Get/create year note

### Inbox
- `GET /inbox/{date}` - Get inbox note for specific date

### Import/Export
- `POST /notes/{noteId}/export` - Export note subtree
- `POST /notes/{noteId}/import` - Import note subtree

### System
- `GET /app-info` - Get application information
- `POST /backup` - Create backup

## Search Query Syntax

### Basic Fulltext
```
towers tolkien
```

### Exact Match
```
"Two Towers"
```

### Label Search
```
#book
towers #book
```

### Complex Queries
```
"javascript" #programming type:code
author:"John Doe" #book dateCreated:>2023-01-01
```

### Search Operators
- `AND`, `OR`, `NOT` for boolean logic
- `type:` filter by note type
- `dateCreated:`, `dateModified:` for date filtering
- `#labelName` for label search
- `~relationName` for relation search

## Error Handling

### Standard Error Response
```yaml
Error:
  code: string
  message: string
  details: object (optional)
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (auth required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

## Server Configuration

### Default Servers
- Local development: `http://localhost:37740/etapi`
- Standard port: `http://localhost:8080/etapi`

### Headers
- `Content-Type: application/json` for JSON requests
- `Authorization: <token>` for authentication
- Custom headers supported for specific operations

## API Patterns

### Pagination
- Use `limit` parameter for result limiting
- No traditional pagination - relies on search refinement

### Timestamps
- All timestamps in ISO 8601 format
- Both local and UTC timestamps provided
- Format: `2023-01-15T14:30:00.000Z`

### Content Handling
- Separate endpoints for metadata vs content
- Content can be text or binary
- MIME types used for content classification

### Tree Structure
- Notes organized in hierarchical tree via branches
- A note can appear in multiple locations (multiple branches)
- Branch controls note placement and ordering

### Protected Notes
- Notes can be password-protected
- Protected content requires additional authentication
- API indicates protection status via `isProtected` flag

## Implementation Notes for MCP Server

### Required Fields
- `noteId` for all note operations
- `search` parameter for search operations
- `title` and `content` for note creation

### Optional Enhancements
- Support for `fastSearch` parameter
- Filtering by `ancestorNoteId` for scoped searches
- Custom `orderBy` and `orderDirection`
- Support for label-based searches

### Security Considerations
- Always validate authentication tokens
- Handle protected notes appropriately
- Sanitize search queries to prevent injection
- Respect rate limits and timeouts

### Performance Optimization
- Use `fastSearch` for quick operations
- Limit result sets with reasonable defaults
- Cache frequently accessed note metadata
- Consider async operations for large exports