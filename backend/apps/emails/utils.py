from email.utils import parsedate_to_datetime
from rest_framework.response import Response
from .services.gmail_service import GmailService

from rest_framework.exceptions import AuthenticationFailed


def parse_headers(headers):
    """
    Convert Gmail headers into a dictionary. Looked up
    case-insensitively, since some messages (older ones sent before a
    header-casing fix) have header names like "to"/"subject" instead
    of the conventional "To"/"Subject".
    """

    result = {}

    for header in headers:
        result[header["name"].lower()] = header["value"]

    return {

        "subject": result.get("subject", ""),

        "sender": result.get("from", ""),

        "receiver": result.get("to", ""),

        "received_at": parsedate_to_datetime(
            result.get("date")
        ) if result.get("date") else None,

    }


def get_gmail_service(request):
    """
    Returns an authenticated GmailService instance for the logged-in user.
    """

    if not request.user.is_authenticated:
        raise AuthenticationFailed("User is not authenticated.")

    return GmailService(request.user)

def success_response(data=None, message="Success", status_code=200):
    """
    Standard success response.
    """

    return Response(
        {
            "success": True,
            "message": message,
            "data": data,
        },
        status=status_code,
    )


def error_response(message="Something went wrong", status_code=400):
    """
    Standard error response.
    """

    return Response(
        {
            "success": False,
            "message": message,
            "data": None,
        },
        status=status_code,
    )