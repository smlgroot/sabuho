import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import { generateMockSession } from './mockData';
import { sessionStore } from './sessionStore';

const app = new Hono();

// Manual CORS middleware - set headers BEFORE processing request
app.use('*', async (c, next) => {
  // Get the requested headers from the preflight request
  const requestedHeaders = c.req.header('Access-Control-Request-Headers') || '*';

  // Set CORS headers on ALL requests (before calling next)
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', '*');
  c.header('Access-Control-Allow-Headers', requestedHeaders);
  c.header('Access-Control-Expose-Headers', '*');
  c.header('Access-Control-Max-Age', '86400');

  // Handle preflight OPTIONS requests
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }

  // Continue to actual route handler
  await next();
});

// State transition sequence with 2-second delays
const STATE_SEQUENCE: Array<'processing' | 'decoding' | 'ocr_completed' | 'ai_processing' | 'completed'> = [
  'processing',
  'decoding',
  'ocr_completed',
  'ai_processing',
  'completed'
];

const STATE_DELAY = 2000; // 2 seconds

// Helper to transition states
const scheduleStateTransition = (sessionId: string, currentStateIndex: number) => {
  if (currentStateIndex >= STATE_SEQUENCE.length - 1) {
    // Already at completed state
    return;
  }

  const nextStateIndex = currentStateIndex + 1;
  const nextState = STATE_SEQUENCE[nextStateIndex];

  const timer = setTimeout(() => {
    console.log(`📊 Session ${sessionId}: ${STATE_SEQUENCE[currentStateIndex]} → ${nextState}`);
    sessionStore.updateSessionStatus(sessionId, nextState);

    // Schedule next transition
    scheduleStateTransition(sessionId, nextStateIndex);
  }, STATE_DELAY);

  sessionStore.setStateTimer(sessionId, timer);
};

// ==================== AWS Lambda Mock Endpoints ====================

// Mock presigned URL endpoint
app.post('/presign', async (c) => {
  const body = await c.req.json();
  const { filename, contentType } = body;

  const jobId = uuidv4();
  const timestamp = new Date().toISOString().split('T')[0];
  const key = `uploads/${timestamp}/${jobId}/${filename}`;

  // Generate mock presigned URL (points to our mock upload endpoint)
  const uploadUrl = `http://localhost:3001/uploads/${timestamp}/${jobId}/${filename}`;

  console.log(`🔑 Generated presigned URL for: ${filename}`);

  return c.json({
    uploadUrl,
    key,
    jobId
  });
});

// Mock S3 upload endpoint
app.put('/uploads/*', async (c) => {
  const filePath = c.req.path.replace('/uploads/', 'uploads/');
  const filename = filePath.split('/').pop() || 'document.pdf';
  const contentType = c.req.header('content-type') || 'application/pdf';

  // Extract jobId from path: uploads/YYYY-MM-DD/jobId/filename
  const pathParts = filePath.split('/');
  const jobId = pathParts[2] || uuidv4();

  console.log(`📤 File uploaded: ${filename} (${contentType})`);
  console.log(`📁 S3 Key: ${filePath}`);
  console.log(`🆔 Job ID: ${jobId}`);

  // Generate mock session and questions
  const { session, questions } = generateMockSession(filename, filePath, contentType, jobId);

  // Store in memory
  sessionStore.addSession(session, questions);

  console.log(`✅ Session created with ID: ${session.id}`);
  console.log(`📝 Generated ${questions.length} questions`);
  console.log(`🔄 Starting state transitions...`);

  // Start state transition sequence (processing is already set)
  scheduleStateTransition(session.id, 0);

  return c.text('', 200);
});

// ==================== Supabase REST API Mock Endpoints ====================

// GET /rest/v1/resource_sessions - Fetch sessions with query params
app.get('/rest/v1/resource_sessions', (c) => {
  const url = new URL(c.req.url);
  const filePathParam = url.searchParams.get('file_path');
  const selectParam = url.searchParams.get('select') || '*';

  // Parse file_path query: file_path=eq.uploads/...
  let filePath: string | null = null;
  if (filePathParam) {
    const match = filePathParam.match(/^eq\.(.+)$/);
    if (match) {
      filePath = match[1];
    }
  }

  if (filePath) {
    const sessionData = sessionStore.getSessionByFilePath(filePath);

    if (sessionData) {
      console.log(`🔍 Session found for file_path: ${filePath} - Status: ${sessionData.session.status}`);
      return c.json([sessionData.session]);
    } else {
      console.log(`❌ No session found for file_path: ${filePath}`);
      return c.json([]);
    }
  }

  return c.json([]);
});

// PATCH /rest/v1/resource_sessions - Update session (not used in our mock, but included for completeness)
app.patch('/rest/v1/resource_sessions', async (c) => {
  const url = new URL(c.req.url);
  const idParam = url.searchParams.get('id');
  const body = await c.req.json();

  // Parse id query: id=eq.uuid
  let sessionId: string | null = null;
  if (idParam) {
    const match = idParam.match(/^eq\.(.+)$/);
    if (match) {
      sessionId = match[1];
    }
  }

  if (sessionId) {
    const sessionData = sessionStore.getSessionById(sessionId);
    if (sessionData) {
      // Update fields
      Object.assign(sessionData.session, body);
      sessionData.session.updated_at = new Date().toISOString();

      console.log(`✏️ Session updated: ${sessionId}`);
      return c.json(sessionData.session);
    }
  }

  return c.json({ error: 'Session not found' }, 404);
});

// GET /rest/v1/resource_session_domains - Get domains for a session
app.get('/rest/v1/resource_session_domains', (c) => {
  const url = new URL(c.req.url);
  const sessionIdParam = url.searchParams.get('resource_session_id');

  // Parse resource_session_id query: resource_session_id=eq.uuid
  let sessionId: string | null = null;
  if (sessionIdParam) {
    const match = sessionIdParam.match(/^eq\.(.+)$/);
    if (match) {
      sessionId = match[1];
    }
  }

  if (sessionId) {
    const sessionData = sessionStore.getSessionById(sessionId);
    if (sessionData) {
      // For now, return empty array as domains aren't used in the current flow
      // Can be extended if needed
      console.log(`📚 Domains requested for session: ${sessionId}`);
      return c.json([]);
    }
  }

  return c.json([]);
});

// GET /rest/v1/resource_session_questions - Get questions for a session
app.get('/rest/v1/resource_session_questions', (c) => {
  const url = new URL(c.req.url);
  const sessionIdParam = url.searchParams.get('resource_session_id');
  const selectParam = url.searchParams.get('select') || '*';

  // Parse resource_session_id query: resource_session_id=eq.uuid
  let sessionId: string | null = null;
  if (sessionIdParam) {
    const match = sessionIdParam.match(/^eq\.(.+)$/);
    if (match) {
      sessionId = match[1];
    }
  }

  if (sessionId) {
    const questions = sessionStore.getQuestionsBySessionId(sessionId);
    console.log(`❓ Questions requested for session: ${sessionId} - Count: ${questions.length}`);
    return c.json(questions);
  }

  return c.json([]);
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const port = process.env.MOCK_SERVER_PORT || 3001;

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀 Mock Backend Server for Sabuho Document Processing      ║
║                                                               ║
║   Server running on: http://localhost:${port}                    ║
║                                                               ║
║   📝 Endpoints:                                               ║
║   • POST /presign - Generate presigned URL                   ║
║   • PUT  /uploads/* - Upload file (triggers state machine)   ║
║   • GET  /rest/v1/resource_sessions - Fetch sessions         ║
║   • GET  /rest/v1/resource_session_questions - Get questions ║
║   • GET  /health - Health check                              ║
║                                                               ║
║   🔄 State Transitions (2s each):                            ║
║   processing → decoding → ocr_completed → ai_processing      ║
║              → completed                                      ║
║                                                               ║
║   📊 Mock Data:                                              ║
║   • 10 topics per document                                   ║
║   • 100 questions per document                               ║
║                                                               ║
║   ⚙️  Configuration:                                         ║
║   Update your .env.local with:                               ║
║   VITE_PRESIGN_URL_API=http://localhost:${port}/presign         ║
║   VITE_SUPABASE_URL=http://localhost:${port}                    ║
║   VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=mock-key             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

export default {
  port,
  fetch: app.fetch,
};
