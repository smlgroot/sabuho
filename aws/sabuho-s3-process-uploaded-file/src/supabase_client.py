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


def _save_resource_session(supabase: Client, file_path: str, name: str,
                           status: str, unparsable: str = None) -> dict:
    """
    Base method to save a resource session record to Supabase
    Handles error handling internally
    Returns the created/updated record or None on error
    """
    try:
        data = {
            'file_path': file_path,
            'name': name,
            'mime_type': 'application/pdf',
            'status': status
        }

        if unparsable:
            data['unparsable'] = unparsable

        result = supabase.table('resource_sessions').upsert(data, on_conflict='file_path').execute()
        print(f"[_save_resource_session] Successfully saved record for: {file_path} with status: {status}")
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[_save_resource_session] Error saving to Supabase: {e}")
        import traceback
        traceback.print_exc()
        return None


def save_resource_session_processing(supabase: Client, file_path: str, name: str) -> dict:
    """Save a resource session record with 'processing' status"""
    return _save_resource_session(supabase, file_path, name, 'processing')


def save_resource_session_completed(supabase: Client, file_path: str, name: str) -> dict:
    """Save a resource session record with 'completed' status"""
    return _save_resource_session(supabase, file_path, name, 'completed')


def save_resource_session_error(supabase: Client, file_path: str, name: str, error_message: str) -> dict:
    """Save a resource session record with 'error' status"""
    return _save_resource_session(supabase, file_path, name, 'error', unparsable=error_message)
