# Sabuho Mock Backend Server

A local backend service that simulates the document processing pipeline for testing and development purposes. This allows you to test the complete document upload and processing flow without connecting to real AWS Lambda, S3, or Supabase services.

## Features

- **Complete State Simulation**: Simulates all document processing states with 2-second transitions
- **Mock Data Generation**: Automatically generates 10 topics and 100 questions for each uploaded document
- **In-Memory Storage**: All data stored in memory - no database persistence
- **Supabase API Compatible**: Mocks Supabase REST API endpoints used by the frontend
- **AWS Lambda Mock**: Simulates presigned URL generation and S3 uploads

## Document Processing States

The mock server simulates the following state transitions (2 seconds each):

```
uploading → processing → decoding → ocr_completed → ai_processing → completed
```

**Total processing time**: ~8 seconds per document

## Quick Start

### 1. Install Dependencies

```bash
yarn add -D hono @types/uuid
```

> **Note**: Bun runtime is required to run the mock server. Install Bun from [bun.sh](https://bun.sh)

### 2. Configure Environment Variables

Copy `.env.local.mock-example` to `.env.local` (or update your existing `.env.local`):

```bash
cp .env.local.mock-example .env.local
```

Make sure the following variables are set:

```env
VITE_SUPABASE_URL=http://localhost:3001
VITE_SUPABASE_ANON_KEY=mock-key
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=mock-key
VITE_PRESIGN_URL_API=http://localhost:3001/presign
```

### 3. Start the Mock Server

```bash
yarn mock-server
```

You should see output like:

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀 Mock Backend Server for Sabuho Document Processing      ║
║                                                               ║
║   Server running on: http://localhost:3001                   ║
║                                                               ║
...
╚═══════════════════════════════════════════════════════════════╝
```

### 4. Start the Frontend

In a separate terminal:

```bash
yarn dev
```

### 5. Test the Flow

1. Navigate to the HomePage
2. Select a PDF, DOCX, TXT, or MD file (max 10MB)
3. Click "Upload"
4. Watch the status indicators progress through the states:
   - ⬆️ Uploading (bouncing)
   - ⚙️ Processing (spinning)
   - 📄 Decoding (spinning)
   - 🔍 OCR Completed (pulsing)
   - ✨ AI Processing (pulsing)
   - 🏆 Completed
5. View the generated topics and questions

## API Endpoints

### AWS Lambda Mock

#### `POST /presign`

Generates a mock presigned URL for S3 upload.

**Request:**
```json
{
  "filename": "document.pdf",
  "contentType": "application/pdf"
}
```

**Response:**
```json
{
  "uploadUrl": "http://localhost:3001/uploads/2024-01-15/uuid/document.pdf",
  "key": "uploads/2024-01-15/uuid/document.pdf",
  "jobId": "uuid"
}
```

#### `PUT /uploads/*`

Mock S3 upload endpoint. Accepts file upload and triggers the state machine.

**Headers:**
- `content-type`: File MIME type

**Response:** 200 OK (empty body)

### Supabase REST API Mock

#### `GET /rest/v1/resource_sessions?file_path=eq.{path}`

Fetch resource session by file path (used for polling).

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "document.pdf",
    "file_path": "uploads/2024-01-15/uuid/document.pdf",
    "url": null,
    "mime_type": "application/pdf",
    "status": "ai_processing",
    "topic_page_range": {
      "topics": [...]
    },
    "created_at": "2024-01-15T12:00:00Z",
    "updated_at": "2024-01-15T12:00:08Z"
  }
]
```

#### `GET /rest/v1/resource_session_questions?resource_session_id=eq.{id}`

Fetch questions for a session.

**Response:**
```json
[
  {
    "id": "uuid",
    "body": "What is the primary focus of Introduction to Core Concepts?",
    "options": [
      "A comprehensive approach",
      "A limited perspective [correct]",
      "An outdated method",
      "A theoretical concept"
    ],
    "created_at": "2024-01-15T12:00:00Z",
    "resource_session_id": "uuid"
  },
  ...
]
```

#### `GET /rest/v1/resource_session_domains?resource_session_id=eq.{id}`

Fetch domains for a session (currently returns empty array).

**Response:**
```json
[]
```

#### `PATCH /rest/v1/resource_sessions?id=eq.{id}`

Update a resource session (included for completeness, not actively used).

### Utility Endpoints

#### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

## Mock Data

### Topics (10 per document)

Each document gets 10 topics with realistic names:
1. Introduction to Core Concepts (pages 1-5)
2. Fundamental Principles (pages 6-11)
3. Advanced Methodologies (pages 12-18)
4. Practical Applications (pages 19-24)
5. Case Studies and Examples (pages 25-31)
6. Best Practices (pages 32-36)
7. Common Challenges (pages 37-42)
8. Implementation Strategies (pages 43-49)
9. Future Trends (pages 50-54)
10. Conclusion and Summary (pages 55-60)

### Questions (100 per document)

- **Total**: 100 questions
- **Distribution**: 10 questions per topic
- **Format**: Multiple choice with 4 options
- **Correct Answer**: Marked with `[correct]` suffix
- **Variety**: 10 different question templates

## Architecture

```
┌─────────────────┐
│   Frontend      │
│   (Vite/React)  │
└────────┬────────┘
         │
         │ HTTP Requests
         │
┌────────▼────────┐
│  Mock Server    │
│  (Hono/Bun)     │
│                 │
│  ┌───────────┐  │
│  │ Session   │  │
│  │ Store     │  │
│  │ (Memory)  │  │
│  └───────────┘  │
│                 │
│  ┌───────────┐  │
│  │ Mock Data │  │
│  │ Generator │  │
│  └───────────┘  │
└─────────────────┘
```

### Components

1. **index.ts**: Main Hono server with all API endpoints
2. **mockData.ts**: Mock data generation (topics, questions, sessions)
3. **sessionStore.ts**: In-memory session storage with state management

## Configuration

### Port

Default port: `3001`

To change, set environment variable:
```bash
MOCK_SERVER_PORT=3002 yarn mock-server
```

### State Transition Delay

Default: 2 seconds between states

To modify, edit `STATE_DELAY` in `index.ts`:
```typescript
const STATE_DELAY = 2000; // milliseconds
```

## Debugging

The mock server provides detailed console logging:

```
🔑 Generated presigned URL for: document.pdf
📤 File uploaded: document.pdf (application/pdf)
📁 S3 Key: uploads/2024-01-15/uuid/document.pdf
🆔 Job ID: uuid
✅ Session created with ID: uuid
📝 Generated 100 questions
🔄 Starting state transitions...
📊 Session uuid: processing → decoding
📊 Session uuid: decoding → ocr_completed
📊 Session uuid: ocr_completed → ai_processing
📊 Session uuid: ai_processing → completed
🔍 Session found for file_path: uploads/... - Status: completed
❓ Questions requested for session: uuid - Count: 100
```

## Switching Between Mock and Production

### Use Mock Server

In `.env.local`:
```env
VITE_SUPABASE_URL=http://localhost:3001
VITE_SUPABASE_ANON_KEY=mock-key
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=mock-key
VITE_PRESIGN_URL_API=http://localhost:3001/presign
```

### Use Production Services

In `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-key
VITE_PRESIGN_URL_API=https://your-lambda-url.amazonaws.com/presign
```

**Important**: Restart both the frontend (`yarn dev`) and mock server (`yarn mock-server`) after changing environment variables.

## Limitations

- **No Persistence**: All data is stored in memory and lost when server restarts
- **No Authentication**: The mock server accepts all requests without validation
- **Fixed Mock Data**: Questions and topics use predefined templates
- **Single Instance**: Not designed for concurrent testing across multiple sessions
- **No Error States**: Currently doesn't simulate failure scenarios (can be extended)

## Troubleshooting

### Port Already in Use

If port 3001 is already in use:
```bash
MOCK_SERVER_PORT=3002 yarn mock-server
```

And update `.env.local` accordingly.

### Frontend Not Connecting

1. Check that `.env.local` has the correct URLs
2. Restart Vite dev server: `yarn dev`
3. Check browser console for CORS errors
4. Verify mock server is running on the expected port

### State Transitions Not Working

1. Check mock server console for state transition logs
2. Verify polling is happening in HomePage (check Network tab)
3. Ensure file upload succeeded (check server logs)

## Future Enhancements

Potential improvements:
- Add configurable failure scenarios
- Support for multiple concurrent uploads
- Persistent storage option (SQLite)
- More realistic question generation
- Performance metrics and analytics
- WebSocket support for real-time updates

## Contributing

When modifying the mock server:
1. Update this README with any new features
2. Add console logging for debugging
3. Maintain API compatibility with frontend
4. Test state transitions thoroughly

## License

This mock server is part of the Sabuho project and follows the same license.
