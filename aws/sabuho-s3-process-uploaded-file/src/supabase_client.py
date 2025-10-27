"""Supabase client and resource_sessions table operations"""
import os
from supabase import create_client, Client


def get_supabase_client() -> Client:
    """Initialize and return Supabase client"""
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')

    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables must be set")

    return create_client(supabase_url, supabase_key)


def _create_resource_session(supabase: Client, file_path: str, name: str, status: str) -> dict:
    """
    Create a new resource session record in Supabase
    Always inserts a new record - never updates
    Returns the created record or None on error
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
    Update an existing resource session record in Supabase
    Returns the updated record or None on error
    """
    try:
        data = {
            'status': status,
            'updated_at': 'now()'
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
    Create a new resource session record with 'processing' status for OCR
    Always creates a new session - returns the session record with ID
    """
    return _create_resource_session(supabase, file_path, name, 'processing')


def save_resource_session_ocr_completed(supabase: Client, session_id: str) -> dict:
    """
    Update an existing resource session record with 'ocr_completed' status
    Requires the session_id from the initial processing call
    """
    return _update_resource_session(supabase, session_id, 'ocr_completed')


def save_resource_session_error(supabase: Client, session_id: str, error_message: str) -> dict:
    """
    Update an existing resource session record with 'error' status
    Requires the session_id from the initial processing call
    """
    return _update_resource_session(supabase, session_id, 'error', unparsable=error_message)
