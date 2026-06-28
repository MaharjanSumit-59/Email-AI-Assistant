from email.utils import parsedate_to_datetime
from rest_framework.response import Response
from .services.gmail_service import GmailService


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
    Returns authenticated GmailService.

    This is currently using placeholder tokens.
    Later replace this with Authentication App.
    """

    # ---------------------------------------
    # TODO
    # Replace after authentication is complete
    # ---------------------------------------

    '''
    def get_gmail_service(request):

    google_account = request.user.google_account

    return GmailService(

        access_token=google_account.access_token,

        refresh_token=google_account.refresh_token

    )
    '''

    access_token = "ACCESS_TOKEN"

    refresh_token = "REFRESH_TOKEN"

    return GmailService(
        access_token,
        refresh_token
    )

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