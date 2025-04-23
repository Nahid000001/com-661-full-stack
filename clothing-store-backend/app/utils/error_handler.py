from flask import jsonify
from werkzeug.exceptions import HTTPException
import traceback

class ApiError(Exception):
    """Base class for API errors."""
    def __init__(self, message, status_code=400, payload=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or {})
        rv['status'] = 'error'
        rv['message'] = self.message
        return rv


class ResourceNotFoundError(ApiError):
    """Resource not found error."""
    def __init__(self, message="Resource not found", payload=None):
        super().__init__(message, 404, payload)


class UnauthorizedError(ApiError):
    """Unauthorized error."""
    def __init__(self, message="Unauthorized access", payload=None):
        super().__init__(message, 401, payload)


class ForbiddenError(ApiError):
    """Forbidden error."""
    def __init__(self, message="Access forbidden", payload=None):
        super().__init__(message, 403, payload)


class ValidationError(ApiError):
    """Validation error."""
    def __init__(self, message="Validation error", payload=None):
        super().__init__(message, 400, payload)


def handle_api_error(error):
    """Handle custom API errors."""
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response


def handle_http_error(error):
    """Handle HTTP exceptions."""
    response = jsonify({
        'status': 'error',
        'message': str(error),
        'code': error.code
    })
    response.status_code = error.code
    return response


def handle_generic_error(error):
    """Handle generic exceptions."""
    # In production, don't return detailed error info
    error_message = str(error)
    stack_trace = traceback.format_exc()
    
    # Log the full error for debugging (in production this should go to a log file)
    print(f"Error: {error_message}")
    print(f"Stack trace: {stack_trace}")
    
    # Return a simplified error to the client
    response = jsonify({
        'status': 'error',
        'message': 'An unexpected error occurred'
    })
    response.status_code = 500
    return response


def register_error_handlers(app):
    """Register error handlers with the Flask app."""
    app.register_error_handler(ApiError, handle_api_error)
    app.register_error_handler(HTTPException, handle_http_error)
    app.register_error_handler(Exception, handle_generic_error) 