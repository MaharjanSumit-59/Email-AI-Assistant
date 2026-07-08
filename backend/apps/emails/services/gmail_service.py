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
    def fetch_inbox(self, max_results=20, label_ids=None):
        """
        Lists messages, scoped by label. Defaults to the INBOX label
        so this only returns mail the user has *received* — Gmail's
        messages.list returns every message in the account (sent
        mail included) if no label filter is given.
        """
        if label_ids is None:
            label_ids = ["INBOX"]

        try:
            response = (
                self.service.users()
                .messages()
                .list(
                    userId=USER_ID,
                    maxResults=max_results,
                    labelIds=label_ids,
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
                    metadataHeaders=["Subject", "subject", "From", "from", "To", "to", "Date", "date"]
                )
                .execute()
            )

        except HttpError as error:
            logger.exception("Failed to fetch message metadata.")
            raise APIException(str(error))

    def get_messages_metadata_batch(self, message_ids):
        """
        Fetches metadata for many messages in a single HTTP round trip
        instead of one request per message. Gmail's API otherwise forces
        a separate call per message id, which is what was making the
        inbox take 5-6 seconds to load for ~25 messages.
        """
        if not message_ids:
            return {}

        results = {}
        errors = []

        def _callback(request_id, response, exception):
            if exception is not None:
                errors.append((request_id, exception))
            else:
                results[request_id] = response

        batch = self.service.new_batch_http_request(callback=_callback)

        for message_id in message_ids:
            batch.add(
                self.service.users().messages().get(
                    userId=USER_ID,
                    id=message_id,
                    format="metadata",
                    metadataHeaders=["Subject", "subject", "From", "from", "To", "to", "Date", "date"],
                ),
                request_id=message_id,
            )

        try:
            batch.execute()
        except HttpError as error:
            logger.exception("Failed to batch-fetch message metadata.")
            raise APIException(str(error))

        if errors:
            logger.warning(
                "Some messages failed to fetch in batch: %s", errors
            )

        return results

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
                name = h["name"].lower()
                if name == "subject":
                    subject = h["value"]
                elif name == "from":
                    sender = h["value"]
                elif name == "to":
                    receiver = h["value"]
                elif name == "date":
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
            message["To"] = to
            message["Subject"] = subject

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
            message["To"] = to
            message["Subject"] = subject

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
    # CREATE DRAFT (reply)
    # -------------------------
    def create_draft(self, thread_id, to, subject, body):
        """
        Creates a Gmail draft reply on the given thread, so it shows up
        in Gmail's Drafts folder ready for the user to review, edit,
        and send themselves.
        """
        try:
            message = MIMEText(body)
            message["To"] = to
            message["Subject"] = subject

            raw = base64.urlsafe_b64encode(
                message.as_bytes()
            ).decode()

            draft = (
                self.service.users()
                .drafts()
                .create(
                    userId=USER_ID,
                    body={
                        "message": {
                            "raw": raw,
                            "threadId": thread_id,
                        }
                    },
                )
                .execute()
            )

            return {
                "draft_id": draft["id"],
                "message_id": draft["message"]["id"],
                "thread_id": draft["message"]["threadId"],
                "status": "drafted",
            }

        except HttpError as error:
            logger.exception("Failed to create draft.")
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
    # DELETE EMAIL (move to Trash)
    # -------------------------
    def delete_email(self, message_id):
        try:
            self.service.users().messages().trash(
                userId=USER_ID,
                id=message_id
            ).execute()

            return {
                "message_id": message_id,
                "status": "trashed"
            }

        except HttpError as error:
            logger.exception("Failed to trash email.")
            raise APIException(str(error))

    # -------------------------
    # RESTORE EMAIL (out of Trash)
    # -------------------------
    def restore_email(self, message_id):
        try:
            self.service.users().messages().untrash(
                userId=USER_ID,
                id=message_id
            ).execute()

            return {
                "message_id": message_id,
                "status": "restored"
            }

        except HttpError as error:
            logger.exception("Failed to restore email from trash.")
            raise APIException(str(error))

    # -------------------------
    # PERMANENTLY DELETE EMAIL
    # -------------------------
    def permanently_delete_email(self, message_id):
        """
        Irreversible. Gmail's messages.delete (as opposed to .trash())
        removes the message immediately with no way to get it back,
        so this should only ever be called on messages already in
        Trash (user-initiated "Delete forever" or the auto-clear job).
        """
        try:
            self.service.users().messages().delete(
                userId=USER_ID,
                id=message_id
            ).execute()

            return {
                "message_id": message_id,
                "status": "permanently_deleted"
            }

        except HttpError as error:
            # Gmail returns 404 if the message was already gone
            # (e.g. manually emptied from Gmail itself, or a retry
            # after a previous call actually succeeded). Treat that
            # as success so cleanup can proceed instead of getting
            # stuck retrying something that's already done.
            if getattr(error, "status_code", None) == 404 or error.resp.status == 404:
                return {
                    "message_id": message_id,
                    "status": "already_deleted"
                }

            logger.exception("Failed to permanently delete email.")
            raise APIException(str(error))