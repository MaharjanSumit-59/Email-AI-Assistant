from email.utils import parsedate_to_datetime
from rest_framework.response import Response
from .services.gmail_service import GmailService

from rest_framework.exceptions import AuthenticationFailed


def parse_headers(headers):
    """
    Convert Gmail headers into a dictionary.
    """

    result = {}

    for header in headers:
        result[header["name"]] = header["value"]

    return {

        "subject": result.get("Subject", ""),

        "sender": result.get("From", ""),

        "receiver": result.get("To", ""),

        "received_at": parsedate_to_datetime(
            result.get("Date")
        ) if result.get("Date") else None,

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