"""
Python FastAPI Supabase Edge Function for PDF processing
Run with: uvicorn main:app --host 0.0.0.0 --port 8000
"""

import os
import json
import asyncio
import threading
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from supabase import create_client, Client
from pdf_processor import process_pdf_document

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["authorization", "x-client-info", "apikey", "content-type"],
)

class ProcessPDFRequest(BaseModel):
    resource_id: str

def get_supabase_client(request: Request) -> Client:
    """Get authenticated Supabase client using service role key"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_service_key:
        raise HTTPException(status_code=500, detail="Missing Supabase configuration")
    
    # Create client with service role key for full access
    supabase = create_client(supabase_url, supabase_service_key)
    
    return supabase

def run_pdf_processing_in_thread(supabase: Client, resource_id: str):
    """Run PDF processing in a separate thread"""
    def thread_worker():
        try:
            print(f"Starting background PDF processing for resource_id: {resource_id}")
            # Run the async function in a new event loop
            asyncio.run(process_pdf_document(supabase, resource_id))
            print(f"Background PDF processing completed for resource_id: {resource_id}")
        except Exception as error:
            print(f"Error in background PDF processing for resource_id {resource_id}: {error}")
    
    # Start the processing in a daemon thread so it doesn't block the main process
    thread = threading.Thread(target=thread_worker, daemon=True)
    thread.start()
    return thread

@app.options("/")
async def handle_options():
    """Handle CORS preflight requests"""
    return JSONResponse(content={"data": None, "error": None})

@app.post("/")
async def process_pdf(
    request_data: ProcessPDFRequest,
    supabase: Client = Depends(get_supabase_client)
):
    """Process PDF document endpoint"""
    try:
        # Start PDF processing in a separate thread immediately
        run_pdf_processing_in_thread(supabase, request_data.resource_id)
        
        # Return immediate success response
        return JSONResponse(
            content={
                "data": {
                    "message": "PDF processing started",
                    "resource_id": request_data.resource_id,
                    "status": "processing"
                }, 
                "error": None
            },
            status_code=200
        )
        
    except Exception as error:
        print(f"Error starting PDF processing: {error}")
        return JSONResponse(
            content={"data": None, "error": str(error)},
            status_code=500
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)