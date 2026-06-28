import base64
from email.mime.text import MIMEText

from django.conf import settings

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from rest_framework.exceptions import APIException
from apps.authentication.models import GoogleToken

import logging
logger = logging.getLogger(__name__)

USER_ID = "me"

class GmailService:
    """
    Service class responsible for interacting with the Gmail API.

    Responsibilities:
    - Authenticate using OAuth credentials
    - Fetch inbox
    - Read email
    - Send email
    - Reply to email
    - Search emails
    - Star/Unstar emails
    - Delete emails
    """

    def __init__(self, user):
        """
        Initialize Gmail service using the logged-in user's
        stored Google OAuth tokens.
        """

        try:
            google_token = GoogleToken.objects.get(user=user)

        except GoogleToken.DoesNotExist:
            raise APIException("Google account is not connected.")

        self.credentials = Credentials(
            token=google_token.access_token,
            refresh_token=google_token.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=google_token.scope.split()
            if google_token.scope
            else settings.GOOGLE_SCOPES,
        )

        # Automatically refresh expired access token
        if self.credentials.expired and self.credentials.refresh_token:

            self.credentials.refresh(Request())

            google_token.access_token = self.credentials.token

            google_token.save(update_fields=["access_token"])

        self.service = build(
            "gmail",
            "v1",
            credentials=self.credentials
        )
    # -------------------------------------------------------
    # PROFILE
    # -------------------------------------------------------

    def get_profile(self):
        """
        Returns Gmail account profile.
        """

        try:
            return (
                self.service
                .users()
                .getProfile(userId=USER_ID)
                .execute()
            )

        except HttpError as error:

            logger.exception(
                "Failed to send email."
            )

            raise APIException(str(error))

    # -------------------------------------------------------
    # FETCH INBOX
    # -------------------------------------------------------

    def fetch_inbox(self, max_results=20):
        """
        Returns latest Gmail message IDs.
        """

        try:

            response = (
                self.service
                .users()
                .messages()
                .list(
                    userId=USER_ID,
                    maxResults=max_results
                )
                .execute()
            )

            return response.get("messages", [])

        except HttpError as error:

            logger.exception(
                "Failed to send email."
            )

            raise APIException(str(error))


    # -------------------------------------------------------
    # GET MESSAGE METADATA
    # -------------------------------------------------------

    def get_message_metadata(self, message_id):
        """
        Returns metadata of a Gmail message.
        """

        try:

            return (
                self.service
                .users()
                .messages()
                .get(
                    userId=USER_ID,
                    id=message_id,
                    format="metadata",
                    metadataHeaders=[
                        "Subject",
                        "From",
                        "To",
                        "Date"
                    ]
                )
                .execute()
            )

        except HttpError as error:

            logger.exception(
                "Failed to send email."
            )

            raise APIException(str(error))
    
    # -------------------------------------------------------
    # READ EMAIL
    # -------------------------------------------------------

    def read_email(self, message_id):
        """
        Returns parsed Gmail message.
        """

        try:

            message = (
                self.service
                .users()
                .messages()
                .get(
                    userId=USER_ID,
                    id=message_id,
                    format="full"
                )
                .execute()
            )

            headers = message["payload"].get("headers", [])

            subject = ""
            sender = ""
            receiver = ""
            date = ""

            for header in headers:

                if header["name"] == "Subject":
                    subject = header["value"]

                elif header["name"] == "From":
                    sender = header["value"]

                elif header["name"] == "To":
                    receiver = header["value"]

                elif header["name"] == "Date":
                    date = header["value"]

            body = self.extract_body(message["payload"])

            return {

                "id": message["id"],

                "thread_id": message["threadId"],

                "subject": subject,

                "from": sender,

                "to": receiver,

                "date": date,

                "snippet": message.get("snippet"),

                "body": body,

                "label_ids": message.get("labelIds", [])

            }

        except HttpError as error:

            logger.exception(
                "Failed to send email."
            )

            raise APIException(str(error))
        
    # -------------------------------------------------------
    # EXTRACT BODY
    # -------------------------------------------------------

    def extract_body(self, payload):
        """
        Extract plain text body from Gmail payload.
        """

        if "parts" in payload:

            for part in payload["parts"]:

                if part["mimeType"] == "text/plain":

                    data = part["body"].get("data")

                    if data:

                        return base64.urlsafe_b64decode(
                            data.encode()
                        ).decode("utf-8")

            for part in payload["parts"]:

                body = self.extract_body(part)

                if body:
                    return body

        else:

            data = payload["body"].get("data")

            if data:

                return base64.urlsafe_b64decode(
                    data.encode()
                ).decode("utf-8")

        return ""

    # -------------------------------------------------------
    # SEND EMAIL
    # -------------------------------------------------------

    def send_email(self, to: str, subject: str, body: str) -> dict:
        """
        Send a plain text email.
        """

        try:

            message = MIMEText(body)

            message["to"] = to

            message["subject"] = subject

            raw_message = base64.urlsafe_b64encode(
                message.as_bytes()
            ).decode()

            send_request = {

                "raw": raw_message

            }

            sent_message = (

                self.service

                .users()

                .messages()

                .send(

                    userId=USER_ID,

                    body=send_request

                )

                .execute()

            )

            return {

                "message_id": sent_message["id"],

                "thread_id": sent_message["threadId"],

                "status": "Email sent successfully"

            }

        except HttpError as error:

            logger.exception(
                "Failed to send email."
            )

            raise APIException(str(error))

    # -------------------------------------------------------
    # REPLY EMAIL
    # -------------------------------------------------------

    def reply_email(
        self,
        thread_id,
        to,
        subject,
        body
    ):
        """
        Reply to an existing Gmail thread.
        """

        try:

            message = MIMEText(body)

            message["to"] = to

            message["subject"] = subject

            raw_message = base64.urlsafe_b64encode(
                message.as_bytes()
            ).decode()

            reply_request = {

                "raw": raw_message,

                "threadId": thread_id

            }

            response = (

                self.service

                .users()

                .messages()

                .send(

                    userId=USER_ID,

                    body=reply_request

                )

                .execute()

            )

            return {

                "message_id": response["id"],

                "thread_id": response["threadId"],

                "status": "Reply sent successfully"

            }

        except HttpError as error:

            logger.exception(
                "Failed to send email."
            )

            raise APIException(str(error))

    # -------------------------------------------------------
    # SEARCH EMAILS
    # -------------------------------------------------------

    def search_emails(self, query, max_results=20):
        """
        Search Gmail messages using Gmail search syntax.
        """

        try:

            response = (
                self.service
                .users()
                .messages()
                .list(
                    userId=USER_ID,
                    q=query,
                    maxResults=max_results
                )
                .execute()
            )

            return response.get("messages", [])

        except HttpError as error:

            logger.exception(
                "Failed to send email."
            )

            raise APIException(str(error))

    # -------------------------------------------------------
    # STAR EMAIL
    # -------------------------------------------------------

    def star_email(self, message_id):
        """
        Add STARRED label to an email.
        """

        try:

            response = (

                self.service

                .users()

                .messages()

                .modify(

                    userId=USER_ID,

                    id=message_id,

                    body={

                        "addLabelIds": [

                            "STARRED"

                        ]

                    }

                )

                .execute()

            )

            return {

                "message_id": message_id,

                "status": "Email starred successfully"

            }

        except HttpError as error:

            logger.exception(
                "Failed to send email."
            )

            raise APIException(str(error))

    # -------------------------------------------------------
    # UNSTAR EMAIL
    # -------------------------------------------------------

    def unstar_email(self, message_id):
        """
        Remove STARRED label.
        """

        try:

            response = (

                self.service

                .users()

                .messages()

                .modify(

                    userId=USER_ID,

                    id=message_id,

                    body={

                        "removeLabelIds": [

                            "STARRED"

                        ]

                    }

                )

                .execute()

            )

            return {

                "message_id": message_id,

                "status": "Email unstarred successfully"

            }

        except HttpError as error:

            logger.exception(
                "Failed to send email."
            )

            raise APIException(str(error))

    # -------------------------------------------------------
    # DELETE EMAIL
    # -------------------------------------------------------

    def delete_email(self, message_id):
        """
        Move an email to Gmail Trash.
        """

        try:

            self.service.users().messages().trash(
                userId=USER_ID,
                id=message_id
            ).execute()

            return {

                "message_id": message_id,

                "status": "Email moved to trash successfully"

            }

        except HttpError as error:

                logger.exception(
                    "Failed to send email."
                )

                raise APIException(str(error))