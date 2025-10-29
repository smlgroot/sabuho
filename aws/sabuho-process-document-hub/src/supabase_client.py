"""
Supabase client and database operations for document processing.

Includes operations for both OCR and AI processing stages.
"""
import os
import httpx
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions
from datetime import datetime


def get_supabase_client() -> Client:
    """
    Initialize and return a Supabase client with extended timeout settings.

    Returns:
        Supabase client instance

    Raises:
        ValueError: If required environment variables are not set
    """
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not supabase_url:
        raise ValueError("SUPABASE_URL environment variable is not set")
    if not supabase_key:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable is not set")

    # Create custom httpx client with extended timeouts
    # Using httpx.Timeout for fine-grained control: (connect, read, write, pool)
    timeout = httpx.Timeout(
        connect=10.0,  # Time to establish connection
        read=60.0,     # Time to read response
        write=60.0,    # Time to send request
        pool=5.0       # Time to acquire connection from pool
    )

    http_client = httpx.Client(timeout=timeout)

    # Configure client options with custom httpx client
    # This is the new recommended way to set timeouts (postgrest_client_timeout is deprecated)
    options = ClientOptions(
        httpx_client=http_client
    )

    return create_client(supabase_url, supabase_key, options=options)


# ============================================================================
# OCR Processing Functions
# ============================================================================

def _create_resource_session(supabase: Client, file_path: str, name: str, status: str) -> dict:
    """
    Create a new resource session record in Supabase.
    Always inserts a new record - never updates.

    Args:
        supabase: Supabase client
        file_path: S3 file path
        name: Display name for the resource
        status: Initial status (e.g., 'processing')

    Returns:
        Created resource session dict or None on error
    """
    try:
        data = {
            'file_path': file_path,
            'name': name,
            'mime_type': 'application/pdf',
            'status': status
        }

        result = supabase.table('resource_sessions').insert(data).execute()
        print(f"[_create_resource_session] Successfully created new session for: {file_path} with status: {status}")
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[_create_resource_session] Error creating session: {e}")
        import traceback
        traceback.print_exc()
        return None


def _update_resource_session(supabase: Client, session_id: str, status: str, unparsable: str = None) -> dict:
    """
    Update an existing resource session record in Supabase.

    Args:
        supabase: Supabase client
        session_id: UUID of the resource session
        status: New status value
        unparsable: Optional error message to store

    Returns:
        Updated resource session dict or None on error
    """
    try:
        data = {
            'status': status,
            'updated_at': datetime.utcnow().isoformat()
        }

        if unparsable:
            data['unparsable'] = unparsable

        result = supabase.table('resource_sessions').update(data).eq('id', session_id).execute()
        print(f"[_update_resource_session] Successfully updated session {session_id} with status: {status}")
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[_update_resource_session] Error updating session: {e}")
        import traceback
        traceback.print_exc()
        return None


def save_resource_session_processing_ocr(supabase: Client, file_path: str, name: str) -> dict:
    """
    Create a new resource session record with 'processing' status for OCR.
    Always creates a new session - returns the session record with ID.

    Args:
        supabase: Supabase client
        file_path: S3 file path
        name: Display name for the resource

    Returns:
        Created resource session dict
    """
    return _create_resource_session(supabase, file_path, name, 'processing')


def save_resource_session_ocr_completed(supabase: Client, session_id: str) -> dict:
    """
    Update an existing resource session record with 'ocr_completed' status.

    Args:
        supabase: Supabase client
        session_id: UUID of the resource session

    Returns:
        Updated resource session dict
    """
    return _update_resource_session(supabase, session_id, 'ocr_completed')


# ============================================================================
# AI Processing Functions
# ============================================================================

def get_resource_session(supabase: Client, session_id: str) -> dict:
    """
    Fetch a resource session by ID.

    Args:
        supabase: Supabase client
        session_id: UUID of the resource session

    Returns:
        Resource session dict

    Raises:
        Exception: If session not found or query fails
    """
    print(f"Fetching resource_session with id: {session_id}")

    result = supabase.table('resource_sessions').select('*').eq('id', session_id).execute()

    if not result.data or len(result.data) == 0:
        raise Exception(f"Resource session not found: {session_id}")

    return result.data[0]


def update_resource_session_status(supabase: Client, session_id: str, status: str):
    """
    Update the status of a resource session.

    Args:
        supabase: Supabase client
        session_id: UUID of the resource session
        status: New status value (e.g., 'ai_processing', 'completed', 'failed')
    """
    print(f"Updating resource_session {session_id} status to: {status}")

    supabase.table('resource_sessions').update({
        'status': status,
        'updated_at': datetime.utcnow().isoformat()
    }).eq('id', session_id).execute()


def save_topics_to_resource_session(supabase: Client, session_id: str, topics_map: dict):
    """
    Save topics map to resource_sessions.topic_page_range (JSONB column).

    Args:
        supabase: Supabase client
        session_id: UUID of the resource session
        topics_map: Topics dict with format {"topics": [...]}
    """
    print(f"Saving topics map to resource_session {session_id}")

    supabase.table('resource_sessions').update({
        'topic_page_range': topics_map,
        'updated_at': datetime.utcnow().isoformat()
    }).eq('id', session_id).execute()


def create_resource_session_domains(supabase: Client, session_id: str, topics_map: dict) -> dict:
    """
    Create resource_session_domains records for each topic.

    Args:
        supabase: Supabase client
        session_id: UUID of the resource session
        topics_map: Topics dict with format {"topics": [{"name": "...", "start": 1, "end": 5}, ...]}

    Returns:
        Dict mapping topic names to domain IDs: {"Topic Name": "uuid-1234", ...}
    """
    topics = topics_map.get('topics', [])
    print(f"Creating {len(topics)} resource_session_domains for session {session_id}")

    domain_mapping = {}

    for topic in topics:
        domain_data = {
            'resource_session_id': session_id,
            'name': topic['name'],
            'page_range_start': topic['start'],
            'page_range_end': topic['end']
        }

        result = supabase.table('resource_session_domains').insert(domain_data).execute()

        if result.data and len(result.data) > 0:
            domain_id = result.data[0]['id']
            domain_mapping[topic['name']] = domain_id
            print(f"Created domain '{topic['name']}' with id: {domain_id}")
        else:
            print(f"Warning: Failed to create domain for topic '{topic['name']}'")

    return domain_mapping


def save_questions_to_db(supabase: Client, questions: list, session_id: str):
    """
    Save questions to resource_session_questions table.

    Args:
        supabase: Supabase client
        questions: List of question dicts with 'domain_id' included
        session_id: UUID of the resource session

    Note:
        Each question should have:
        - question (mapped to 'body')
        - options (array)
        - correct_answer_index (used to mark correct option)
        - domain_id (mapped to 'resource_session_domain_id')
        - source_text (mapped to 'explanation')
    """
    print(f"Saving {len(questions)} questions to database...")

    if not questions:
        print("No questions to save")
        return

    # Prepare questions for batch insert
    questions_data = []

    for q in questions:
        # Transform options array into the format expected by DB
        # Mark the correct answer with [correct] suffix
        options_with_correct = []
        for i, option in enumerate(q['options']):
            if i == q['correct_answer_index']:
                options_with_correct.append(f"{option} [correct]")
            else:
                options_with_correct.append(option)

        question_data = {
            'resource_session_id': session_id,
            'resource_session_domain_id': q['domain_id'],
            'type': 'multiple_options',
            'body': q['question'],
            'options': options_with_correct,  # JSONB array of strings
            'explanation': q.get('source_text', '')
        }

        questions_data.append(question_data)

    # Batch insert all questions
    try:
        result = supabase.table('resource_session_questions').insert(questions_data).execute()
        print(f"Successfully saved {len(result.data)} questions")
    except Exception as e:
        print(f"Error saving questions: {e}")
        # Try inserting one by one if batch insert fails
        print("Attempting to save questions individually...")
        success_count = 0
        for question_data in questions_data:
            try:
                supabase.table('resource_session_questions').insert(question_data).execute()
                success_count += 1
            except Exception as individual_error:
                print(f"Failed to save question: {individual_error}")

        print(f"Successfully saved {success_count}/{len(questions_data)} questions individually")


def get_resource_session_domains(supabase: Client, session_id: str) -> list:
    """
    Fetch all resource_session_domains for a given session.

    Args:
        supabase: Supabase client
        session_id: UUID of the resource session

    Returns:
        List of domain dicts

    Raises:
        Exception: If query fails
    """
    print(f"Fetching resource_session_domains for session: {session_id}")

    result = supabase.table('resource_session_domains').select('*').eq('resource_session_id', session_id).execute()

    return result.data


# ============================================================================
# Shared Error Handling
# ============================================================================

def save_resource_session_error(supabase: Client, session_id: str, error_message: str):
    """
    Update resource session with error/failed status and message.
    Works for both OCR and AI processing errors.

    Args:
        supabase: Supabase client
        session_id: UUID of the resource session
        error_message: Error message to save
    """
    print(f"Saving error for resource_session {session_id}: {error_message[:100]}...")

    supabase.table('resource_sessions').update({
        'status': 'failed',
        'unparsable': error_message,  # Store error in unparsable field
        'updated_at': datetime.utcnow().isoformat()
    }).eq('id', session_id).execute()
