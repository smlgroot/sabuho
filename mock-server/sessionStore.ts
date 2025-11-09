import type { MockResourceSession, MockQuestion, MockDomain } from './mockData';

interface SessionData {
  session: MockResourceSession;
  domains: MockDomain[];
  questions: MockQuestion[];
  stateTimer?: NodeJS.Timeout;
}

class SessionStore {
  private sessions: Map<string, SessionData> = new Map();
  private sessionsByFilePath: Map<string, string> = new Map(); // filePath -> sessionId

  // Add a new session
  addSession(session: MockResourceSession, domains: MockDomain[], questions: MockQuestion[]): void {
    this.sessions.set(session.id, { session, domains, questions });
    this.sessionsByFilePath.set(session.file_path, session.id);
  }

  // Get session by ID
  getSessionById(id: string): SessionData | undefined {
    return this.sessions.get(id);
  }

  // Get session by file path
  getSessionByFilePath(filePath: string): SessionData | undefined {
    const sessionId = this.sessionsByFilePath.get(filePath);
    if (!sessionId) return undefined;
    return this.sessions.get(sessionId);
  }

  // Update session status
  updateSessionStatus(
    sessionId: string,
    status: MockResourceSession['status']
  ): void {
    const sessionData = this.sessions.get(sessionId);
    if (sessionData) {
      sessionData.session.status = status;
      sessionData.session.updated_at = new Date().toISOString();
    }
  }

  // Set state timer for a session
  setStateTimer(sessionId: string, timer: NodeJS.Timeout): void {
    const sessionData = this.sessions.get(sessionId);
    if (sessionData) {
      // Clear existing timer if any
      if (sessionData.stateTimer) {
        clearTimeout(sessionData.stateTimer);
      }
      sessionData.stateTimer = timer;
    }
  }

  // Clear state timer for a session
  clearStateTimer(sessionId: string): void {
    const sessionData = this.sessions.get(sessionId);
    if (sessionData?.stateTimer) {
      clearTimeout(sessionData.stateTimer);
      sessionData.stateTimer = undefined;
    }
  }

  // Get all questions for a session
  getQuestionsBySessionId(sessionId: string): MockQuestion[] {
    const sessionData = this.sessions.get(sessionId);
    return sessionData?.questions || [];
  }

  // Get all domains for a session
  getDomainsBySessionId(sessionId: string): MockDomain[] {
    const sessionData = this.sessions.get(sessionId);
    return sessionData?.domains || [];
  }

  // Get all sessions by repository ID
  getSessionsByRepositoryId(repositoryId: string): MockResourceSession[] {
    const sessions: MockResourceSession[] = [];
    this.sessions.forEach((data) => {
      if (data.session.resource_repository_id === repositoryId) {
        sessions.push(data.session);
      }
    });
    return sessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // Get all domains by repository ID (across all sessions)
  getDomainsByRepositoryId(repositoryId: string): MockDomain[] {
    const domains: MockDomain[] = [];
    this.sessions.forEach((data) => {
      if (data.session.resource_repository_id === repositoryId) {
        domains.push(...data.domains);
      }
    });
    return domains.sort((a, b) => a.page_range_start - b.page_range_start);
  }

  // Get all questions by repository ID (across all sessions)
  getQuestionsByRepositoryId(repositoryId: string, isSampleFilter: boolean | null = null): MockQuestion[] {
    const questions: MockQuestion[] = [];
    this.sessions.forEach((data) => {
      if (data.session.resource_repository_id === repositoryId) {
        const sessionQuestions = isSampleFilter !== null
          ? data.questions.filter(q => q.is_sample === isSampleFilter)
          : data.questions;
        questions.push(...sessionQuestions);
      }
    });
    return questions.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  // Clear all sessions (useful for testing)
  clear(): void {
    // Clear all timers
    this.sessions.forEach((data) => {
      if (data.stateTimer) {
        clearTimeout(data.stateTimer);
      }
    });
    this.sessions.clear();
    this.sessionsByFilePath.clear();
  }
}

// Export singleton instance
export const sessionStore = new SessionStore();
