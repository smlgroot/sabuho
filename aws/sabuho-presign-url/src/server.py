"""
Flask server wrapper for presign Lambda function.
Allows running the Lambda function as a regular HTTP service for local development.
"""
import os
import json
from flask import Flask, request, jsonify
from src.lambda_function import lambda_handler

app = Flask(__name__)


@app.route('/presign', methods=['POST', 'OPTIONS'])
def presign():
    """Handle presign URL requests."""
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response

    # Convert Flask request to Lambda event format
    event = {
        'httpMethod': 'POST',
        'headers': dict(request.headers),
        'body': request.get_data(as_text=True) if request.data else None
    }

    # Call Lambda handler
    lambda_response = lambda_handler(event, {})

    # Convert Lambda response to Flask response
    response = jsonify(lambda_response.get('body', {}))
    response.status_code = lambda_response.get('statusCode', 200)

    # Add CORS headers
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'

    # Parse JSON body from Lambda response if it's a string
    if isinstance(lambda_response.get('body'), str):
        try:
            response = jsonify(json.loads(lambda_response['body']))
            response.status_code = lambda_response.get('statusCode', 200)
            response.headers['Access-Control-Allow-Origin'] = '*'
        except json.JSONDecodeError:
            pass

    return response


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({'status': 'ok'}), 200


if __name__ == '__main__':
    print("\n🚀 Presign URL Service - Running on port 8080\n")
    app.run(host='0.0.0.0', port=8080, debug=True)
