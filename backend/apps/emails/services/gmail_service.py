import base64
import logging
from email.mime.text import MIMEText

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from rest_framework.exceptions import APIException

from apps.base_google.base_google_service import BaseGoogleService


logger = logging.getLogger(__name__)

USER_ID = "me"


class GmailService(BaseGoogleService):
    """
    Gmail API service layer.

    Handles:
    - Inbox fetching
    - Reading emails
    - Sending emails
    - Replying to emails
    - Searching emails
    - Starring / unstarring
    - Deleting emails
    """

    def __init__(self, user):
        super().__init__(user)

        self.service = build(
            "gmail",
            "v1",
            credentials=self.credentials
        )

    # -------------------------
    # PROFILE
    # -------------------------
    def get_profile(self):
        try:
            return self.service.users().getProfile(userId=USER_ID).execute()

        except HttpError as error:
            logger.exception("Failed to fetch Gmail profile.")
            raise APIException(str(error))

    # -------------------------
    # INBOX
    # -------------------------
    def fetch_inbox(self, max_results=20):
        try:
            response = (
                self.service.users()
                .messages()
                .list(
                    userId=USER_ID,
                    maxResults=max_results
                )
                .execute()
            )

            return response.get("messages", [])

        except HttpError as error:
            logger.exception("Failed to fetch inbox.")
            raise APIException(str(error))

    # -------------------------
    # METADATA
    # -------------------------
    def get_message_metadata(self, message_id):
        try:
            return (
                self.service.users()
                .messages()
                .get(
                    userId=USER_ID,
                    id=message_id,
                    format="metadata",
                    metadataHeaders=["Subject", "From", "To", "Date"]
                )
                .execute()
            )

        except HttpError as error:
            logger.exception("Failed to fetch message metadata.")
            raise APIException(str(error))

    # -------------------------
    # READ EMAIL
    # -------------------------
    def read_email(self, message_id):
        try:
            message = (
                self.service.users()
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

            for h in headers:
                if h["name"] == "Subject":
                    subject = h["value"]
                elif h["name"] == "From":
                    sender = h["value"]
                elif h["name"] == "To":
                    receiver = h["value"]
                elif h["name"] == "Date":
                    date = h["value"]

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
            logger.exception("Failed to read email.")
            raise APIException(str(error))

    # -------------------------
    # BODY EXTRACTION
    # -------------------------
    def extract_body(self, payload):
        if "parts" in payload:
            for part in payload["parts"]:
                if part.get("mimeType") == "text/plain":
                    data = part["body"].get("data")
                    if data:
                        return base64.urlsafe_b64decode(data).decode("utf-8")

            for part in payload["parts"]:
                body = self.extract_body(part)
                if body:
                    return body

        else:
            data = payload.get("body", {}).get("data")
            if data:
                return base64.urlsafe_b64decode(data).decode("utf-8")

        return ""

    # -------------------------
    # SEND EMAIL
    # -------------------------
    def send_email(self, to: str, subject: str, body: str):
        try:
            message = MIMEText(body)
            message["to"] = to
            message["subject"] = subject

            raw = base64.urlsafe_b64encode(
                message.as_bytes()
            ).decode()

            sent = (
                self.service.users()
                .messages()
                .send(
                    userId=USER_ID,
                    body={"raw": raw}
                )
                .execute()
            )

            return {
                "message_id": sent["id"],
                "thread_id": sent["threadId"],
                "status": "sent"
            }

        except HttpError as error:
            logger.exception("Failed to send email.")
            raise APIException(str(error))

    # -------------------------
    # REPLY EMAIL
    # -------------------------
    def reply_email(self, thread_id, to, subject, body):
        try:
            message = MIMEText(body)
            message["to"] = to
            message["subject"] = subject

            raw = base64.urlsafe_b64encode(
                message.as_bytes()
            ).decode()

            sent = (
                self.service.users()
                .messages()
                .send(
                    userId=USER_ID,
                    body={
                        "raw": raw,
                        "threadId": thread_id
                    }
                )
                .execute()
            )

            return {
                "message_id": sent["id"],
                "thread_id": sent["threadId"],
                "status": "replied"
            }

        except HttpError as error:
            logger.exception("Failed to reply email.")
            raise APIException(str(error))

    # -------------------------
    # SEARCH EMAILS
    # -------------------------
    def search_emails(self, query, max_results=20):
        try:
            response = (
                self.service.users()
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
            logger.exception("Failed to search emails.")
            raise APIException(str(error))

    # -------------------------
    # STAR EMAIL
    # -------------------------
    def star_email(self, message_id):
        try:
            self.service.users().messages().modify(
                userId=USER_ID,
                id=message_id,
                body={"addLabelIds": ["STARRED"]}
            ).execute()

            return {
                "message_id": message_id,
                "status": "starred"
            }

        except HttpError as error:
            logger.exception("Failed to star email.")
            raise APIException(str(error))

    # -------------------------
    # UNSTAR EMAIL
    # -------------------------
    def unstar_email(self, message_id):
        try:
            self.service.users().messages().modify(
                userId=USER_ID,
                id=message_id,
                body={"removeLabelIds": ["STARRED"]}
            ).execute()

            return {
                "message_id": message_id,
                "status": "unstarred"
            }

        except HttpError as error:
            logger.exception("Failed to unstar email.")
            raise APIException(str(error))

    # -------------------------
    # DELETE EMAIL
    # -------------------------
    def delete_email(self, message_id):
        try:
            self.service.users().messages().trash(
                userId=USER_ID,
                id=message_id
            ).execute()

            return {
                "message_id": message_id,
                "status": "deleted"
            }

        except HttpError as error:
            logger.exception("Failed to delete email.")
            raise APIException(str(error))