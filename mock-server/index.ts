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

// Generate realistic state sequence with progress tracking
const generateStateSequence = (): string[] => {
  const states: string[] = [];

  // 1. Initial processing state
  states.push('processing');

  // 2. OCR page-by-page processing (simulate 10 pages)
  const totalPages = 10;
  for (let i = 1; i <= totalPages; i++) {
    states.push(`ocr_page_${i}_of_${totalPages}`);
  }

  // 3. OCR completed
  states.push('ocr_completed');

  // 4. AI processing starts
  states.push('ai_processing');

  // 5. Optional: Chunking for large documents (simulate 3 chunks)
  // Uncomment to test chunking states
  // const totalChunks = 3;
  // for (let i = 1; i <= totalChunks; i++) {
  //   states.push(`ai_chunking_${i}_of_${totalChunks}`);
  // }

  // 6. Topics identified
  states.push('ai_topics_identified');

  // 7. Question generation in batches (simulate 5 batches)
  const totalBatches = 5;
  for (let i = 1; i <= totalBatches; i++) {
    states.push(`ai_batch_${i}_of_${totalBatches}`);
  }

  // 8. Completed
  states.push('completed');

  return states;
};

const STATE_DELAY = 400; // 400ms between state transitions (faster for demo)

// Helper to transition states
const scheduleStateTransition = (sessionId: string, stateSequence: string[], currentStateIndex: number) => {
  if (currentStateIndex >= stateSequence.length - 1) {
    // Already at completed state
    return;
  }

  const nextStateIndex = currentStateIndex + 1;
  const nextState = stateSequence[nextStateIndex];

  const timer = setTimeout(() => {
    console.log(`📊 Session ${sessionId}: ${stateSequence[currentStateIndex]} → ${nextState}`);
    sessionStore.updateSessionStatus(sessionId, nextState);

    // Schedule next transition
    scheduleStateTransition(sessionId, stateSequence, nextStateIndex);
  }, STATE_DELAY);

  sessionStore.setStateTimer(sessionId, timer);
};

// ==================== AWS Lambda Mock Endpoints ====================

// Mock presigned URL endpoint
app.post('/presign', async (c) => {
  const body = await c.req.json();
  const { filename, contentType, resource_repository_id } = body;

  const jobId = uuidv4();
  const timestamp = new Date().toISOString().split('T')[0];
  const key = `uploads/${timestamp}/${jobId}/${filename}`;

  // Generate mock presigned URL (points to our mock upload endpoint)
  const uploadUrl = `http://localhost:3001/uploads/${timestamp}/${jobId}/${filename}`;

  console.log(`🔑 Generated presigned URL for: ${filename}`);
  if (resource_repository_id) {
    console.log(`📦 Repository ID: ${resource_repository_id}`);
  }

  return c.json({
    uploadUrl,
    key,
    jobId,
    resource_repository_id
  });
});

// Mock S3 upload endpoint
app.put('/uploads/*', async (c) => {
  const filePath = c.req.path.replace('/uploads/', 'uploads/');
  const filename = filePath.split('/').pop() || 'document.pdf';
  const contentType = c.req.header('content-type') || 'application/pdf';

  // Extract resource_repository_id from query params
  const url = new URL(c.req.url);
  const resourceRepositoryId = url.searchParams.get('resource_repository_id') || null;

  // Extract jobId from path: uploads/YYYY-MM-DD/jobId/filename
  const pathParts = filePath.split('/');
  const jobId = pathParts[2] || uuidv4();

  console.log(`📤 File uploaded: ${filename} (${contentType})`);
  console.log(`📁 S3 Key: ${filePath}`);
  console.log(`🆔 Job ID: ${jobId}`);
  if (resourceRepositoryId) {
    console.log(`📦 Repository ID: ${resourceRepositoryId}`);
  }

  // Generate mock session, domains, and questions with repository ID
  const { session, domains, questions } = generateMockSession(
    filename,
    filePath,
    contentType,
    jobId,
    resourceRepositoryId
  );

  // Store in memory
  sessionStore.addSession(session, domains, questions);

  console.log(`✅ Session created with ID: ${session.id}`);
  console.log(`📚 Generated ${domains.length} domains`);
  console.log(`📝 Generated ${questions.length} questions`);
  console.log(`🔄 Starting state transitions...`);

  // Generate state sequence and start transitions
  const stateSequence = generateStateSequence();
  console.log(`📋 State sequence: ${stateSequence.length} states`);
  scheduleStateTransition(session.id, stateSequence, 0);

  return c.text('', 200);
});

// ==================== Supabase REST API Mock Endpoints ====================

// POST /rest/v1/resource_sessions - Create a new session
app.post('/rest/v1/resource_sessions', async (c) => {
  const url = new URL(c.req.url);
  const selectParam = url.searchParams.get('select') || '*';
  const body = await c.req.json();

  // Create session with provided data or generate defaults
  const session = {
    id: body.id || uuidv4(),
    file_path: body.file_path,
    status: body.status || 'processing',
    resource_repository_id: body.resource_repository_id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...body
  };

  // Store in session store
  sessionStore.addSession(session, [], []);

  console.log(`✅ Session created via POST: ${session.id} - file_path: ${session.file_path}`);

  // Return as array (Supabase returns arrays for inserts)
  return c.json([session]);
});

// GET /rest/v1/resource_sessions - Fetch sessions with query params
app.get('/rest/v1/resource_sessions', (c) => {
  const url = new URL(c.req.url);
  const filePathParam = url.searchParams.get('file_path');
  const idParam = url.searchParams.get('id');
  const repositoryIdParam = url.searchParams.get('resource_repository_id');

  // Parse id query: id=eq.uuid (UI uses .single())
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
      console.log(`🔍 Session found for id: ${sessionId} - Status: ${sessionData.session.status}`);
      return c.json(sessionData.session); // UI uses .single() - return object
    } else {
      console.log(`❌ No session found for id: ${sessionId}`);
      return c.json(null); // .single() returns null if not found
    }
  }

  // Parse file_path query: file_path=eq.uploads/... (UI uses .maybeSingle())
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
      return c.json(sessionData.session); // UI uses .maybeSingle() - return object
    } else {
      console.log(`❌ No session found for file_path: ${filePath}`);
      return c.json(null); // .maybeSingle() returns null if not found
    }
  }

  // Parse resource_repository_id query (UI does NOT use .single())
  let repositoryId: string | null = null;
  if (repositoryIdParam) {
    const match = repositoryIdParam.match(/^eq\.(.+)$/);
    if (match) {
      repositoryId = match[1];
    }
  }

  if (repositoryId) {
    const sessions = sessionStore.getSessionsByRepositoryId(repositoryId);
    console.log(`📦 Sessions found for repository: ${repositoryId} - Count: ${sessions.length}`);
    return c.json(sessions); // Return array - no .single() used
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
      return c.json([sessionData.session]);
    }
  }

  return c.json({ error: 'Session not found' }, 404);
});

// POST /rest/v1/resource_session_domains - Create domains for a session
app.post('/rest/v1/resource_session_domains', async (c) => {
  const body = await c.req.json();

  // Body can be a single object or an array
  const domains = Array.isArray(body) ? body : [body];

  // For each domain, ensure it has required fields
  const createdDomains = domains.map(domain => ({
    id: domain.id || uuidv4(),
    resource_session_id: domain.resource_session_id,
    name: domain.name,
    created_at: new Date().toISOString(),
    ...domain
  }));

  // Add domains to the session in the store
  if (createdDomains.length > 0) {
    const sessionId = createdDomains[0].resource_session_id;
    const sessionData = sessionStore.getSessionById(sessionId);
    if (sessionData) {
      sessionData.domains.push(...createdDomains);
      console.log(`📚 Added ${createdDomains.length} domains to session ${sessionId}`);
    }
  }

  // Return as array
  return c.json(createdDomains);
});

// GET /rest/v1/resource_session_domains - Get domains for a session or repository
app.get('/rest/v1/resource_session_domains', (c) => {
  const url = new URL(c.req.url);
  const sessionIdParam = url.searchParams.get('resource_session_id');
  const repositoryIdParam = url.searchParams.get('resource_repository_id');

  // Parse resource_session_id query: resource_session_id=eq.uuid
  let sessionId: string | null = null;
  if (sessionIdParam) {
    const match = sessionIdParam.match(/^eq\.(.+)$/);
    if (match) {
      sessionId = match[1];
    }
  }

  // Query by session_id takes precedence
  if (sessionId) {
    const domains = sessionStore.getDomainsBySessionId(sessionId);
    console.log(`📚 Domains requested for session: ${sessionId} - Returning ${domains.length} domains`);
    return c.json(domains);
  }

  // Parse resource_repository_id query: resource_repository_id=eq.uuid
  let repositoryId: string | null = null;
  if (repositoryIdParam) {
    const match = repositoryIdParam.match(/^eq\.(.+)$/);
    if (match) {
      repositoryId = match[1];
    }
  }

  if (repositoryId) {
    const domains = sessionStore.getDomainsByRepositoryId(repositoryId);
    console.log(`📦 Domains requested for repository: ${repositoryId} - Returning ${domains.length} domains`);
    return c.json(domains);
  }

  return c.json([]);
});

// POST /rest/v1/resource_session_questions - Create questions for a session
app.post('/rest/v1/resource_session_questions', async (c) => {
  const body = await c.req.json();

  // Body can be a single object or an array
  const questions = Array.isArray(body) ? body : [body];

  // For each question, ensure it has required fields
  const createdQuestions = questions.map(question => ({
    id: question.id || uuidv4(),
    resource_session_id: question.resource_session_id,
    resource_session_domain_id: question.resource_session_domain_id || null,
    question: question.question,
    correct_answer: question.correct_answer,
    incorrect_answers: question.incorrect_answers || [],
    explanation: question.explanation || null,
    difficulty: question.difficulty || 'medium',
    is_sample: question.is_sample !== undefined ? question.is_sample : false,
    created_at: new Date().toISOString(),
    ...question
  }));

  // Add questions to the session in the store
  if (createdQuestions.length > 0) {
    const sessionId = createdQuestions[0].resource_session_id;
    const sessionData = sessionStore.getSessionById(sessionId);
    if (sessionData) {
      sessionData.questions.push(...createdQuestions);
      console.log(`❓ Added ${createdQuestions.length} questions to session ${sessionId}`);
    }
  }

  // Return as array
  return c.json(createdQuestions);
});

// GET /rest/v1/resource_session_questions - Get questions for a session or repository
app.get('/rest/v1/resource_session_questions', (c) => {
  const url = new URL(c.req.url);
  const sessionIdParam = url.searchParams.get('resource_session_id');
  const repositoryIdParam = url.searchParams.get('resource_repository_id');
  const isSampleParam = url.searchParams.get('is_sample');
  const preferHeader = c.req.header('Prefer') || '';

  // Check if this is a count-only request
  const isCountRequest = preferHeader.includes('count=exact');

  // Parse resource_session_id query: resource_session_id=eq.uuid
  let sessionId: string | null = null;
  if (sessionIdParam) {
    const match = sessionIdParam.match(/^eq\.(.+)$/);
    if (match) {
      sessionId = match[1];
    }
  }

  // Parse resource_repository_id query: resource_repository_id=eq.uuid
  let repositoryId: string | null = null;
  if (repositoryIdParam) {
    const match = repositoryIdParam.match(/^eq\.(.+)$/);
    if (match) {
      repositoryId = match[1];
    }
  }

  // Parse is_sample query: is_sample=eq.false or is_sample=eq.true
  let isSampleFilter: boolean | null = null;
  if (isSampleParam) {
    const match = isSampleParam.match(/^eq\.(true|false)$/);
    if (match) {
      isSampleFilter = match[1] === 'true';
    }
  }

  // Query by session_id takes precedence
  if (sessionId) {
    const allQuestions = sessionStore.getQuestionsBySessionId(sessionId);

    // Filter by is_sample if provided
    const filteredQuestions = isSampleFilter !== null
      ? allQuestions.filter(q => q.is_sample === isSampleFilter)
      : allQuestions;

    const count = filteredQuestions.length;

    console.log(`❓ Questions requested for session: ${sessionId} - Total: ${allQuestions.length}, is_sample=${isSampleFilter}, Count request: ${isCountRequest}, Returning: ${count}`);

    // Set Content-Range header (Supabase standard for counts)
    c.header('Content-Range', `0-${count > 0 ? count - 1 : 0}/${count}`);

    // For count-only requests, return empty array (Supabase client reads count from header)
    if (isCountRequest) {
      return c.json([]);
    }

    // Return array directly (like Supabase PostgREST does)
    return c.json(filteredQuestions);
  }

  // Query by repository_id
  if (repositoryId) {
    const allQuestions = sessionStore.getQuestionsByRepositoryId(repositoryId, isSampleFilter);
    const count = allQuestions.length;

    console.log(`📦 Questions requested for repository: ${repositoryId} - is_sample=${isSampleFilter}, Returning: ${count}`);

    // Set Content-Range header (Supabase standard for counts)
    c.header('Content-Range', `0-${count > 0 ? count - 1 : 0}/${count}`);

    // For count-only requests, return empty array (Supabase client reads count from header)
    if (isCountRequest) {
      return c.json([]);
    }

    // Return array directly (like Supabase PostgREST does)
    return c.json(allQuestions);
  }

  c.header('Content-Range', `0-0/0`);
  return c.json([]);
});

// POST /rest/v1/resource_repositories - Create a new resource repository
// UI always uses .insert().select().single() - so always return single object
app.post('/rest/v1/resource_repositories', async (c) => {
  const repository = {
    id: uuidv4(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  console.log(`📦 Created resource_repository with id: ${repository.id}`);

  // Return single object (UI uses .single())
  return c.json(repository);
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
║   • POST /rest/v1/resource_repositories - Create repository  ║
║   • GET  /rest/v1/resource_sessions - Fetch sessions         ║
║   • GET  /rest/v1/resource_session_questions - Get questions ║
║   • GET  /health - Health check                              ║
║                                                               ║
║   🔄 State Transitions (400ms each):                         ║
║   processing → ocr_page_1_of_10 → ... → ocr_page_10_of_10  ║
║   → ocr_completed → ai_processing → ai_topics_identified    ║
║   → ai_batch_1_of_5 → ... → ai_batch_5_of_5 → completed    ║
║                                                               ║
║   📊 Mock Data:                                              ║
║   • 10 topics per document                                   ║
║   • 100 questions total (25 with is_sample=false)            ║
║   • Query is_sample=eq.false → returns 25 sample questions  ║
║   • Query without is_sample filter → returns all 100        ║
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
