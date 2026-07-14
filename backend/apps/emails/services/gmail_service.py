import base64
import logging
from email import encoders
from email.mime.application import MIMEApplication
from email.mime.base import MIMEBase
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
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

            text_body, html_body, attachments = self.extract_content(message["payload"])

            # `_gmail_attachment_id` / `_inline_data` are internal
            # details used by get_attachment — strip them before this
            # goes out over the API so responses don't leak Gmail's raw
            # (and possibly stale-by-the-time-you-use-it) attachmentId
            # or balloon with inline attachment bytes the client never
            # asked for.
            _INTERNAL_KEYS = ("_gmail_attachment_id", "_inline_data")
            public_attachments = [
                {k: v for k, v in attachment.items() if k not in _INTERNAL_KEYS}
                for attachment in attachments
            ]

            return {
                "id": message["id"],
                "thread_id": message["threadId"],
                "subject": subject,
                "from": sender,
                "to": receiver,
                "date": date,
                "snippet": message.get("snippet"),
                "body": text_body,
                "body_html": html_body,
                "attachments": public_attachments,
                "label_ids": message.get("labelIds", [])
            }

        except HttpError as error:
            logger.exception("Failed to read email.")
            raise APIException(str(error))

    # -------------------------
    # BODY + ATTACHMENT EXTRACTION
    # -------------------------
    def extract_content(self, payload):
        """
        Walks the (possibly nested) MIME parts of a message once,
        collecting the plain-text body, the HTML body, and metadata
        for any parts that are attachments (rather than message body
        text). Attachment bytes themselves are NOT fetched here —
        only enough info (attachment_id, filename, mime type, size)
        to list them and later fetch one on demand via get_attachment.
        """
        text_parts = []
        html_parts = []
        attachments = []

        self._walk_parts(payload, text_parts, html_parts, attachments, _counter=[0])

        return (
            "\n".join(text_parts),
            "".join(html_parts),
            attachments,
        )

    def _walk_parts(self, payload, text_parts, html_parts, attachments, _counter):
        mime_type = payload.get("mimeType", "")
        filename = payload.get("filename", "")
        body = payload.get("body", {})

        # A part is treated as an attachment if it carries a filename —
        # that's how Gmail distinguishes an inline body part from a
        # real attachment, regardless of its mime type.
        if filename:
            # We identify attachments by where they fall in the MIME
            # walk rather than by Gmail's own attachmentId. Gmail does
            # NOT guarantee that attachmentId stays the same across
            # separate messages.get() calls for the same message — it
            # can hand back a different token each time, even though
            # every token it has ever issued keeps working. Matching on
            # the id we got the first time therefore fails intermittently.
            # The part's position in the structure is stable for a given
            # message, so we use that as our own client-facing id, and
            # only trust whatever attachmentId Gmail returns *at the
            # moment we actually fetch* — see find_attachment_meta /
            # get_attachment below.
            position = _counter[0]
            _counter[0] += 1

            attachment = {
                "attachment_id": f"att-{position}",
                "filename": filename,
                "mime_type": mime_type or "application/octet-stream",
                "size": body.get("size", 0),
            }

            gmail_attachment_id = body.get("attachmentId")
            if gmail_attachment_id:
                attachment["_gmail_attachment_id"] = gmail_attachment_id
            else:
                # Small attachments are inlined directly into this
                # part's body.data with no attachmentId at all — there's
                # nothing to re-fetch later, so stash the data itself.
                attachment["_inline_data"] = body.get("data")

            attachments.append(attachment)
        elif mime_type == "text/plain" and body.get("data"):
            text_parts.append(
                base64.urlsafe_b64decode(body["data"]).decode("utf-8", errors="replace")
            )
        elif mime_type == "text/html" and body.get("data"):
            html_parts.append(
                base64.urlsafe_b64decode(body["data"]).decode("utf-8", errors="replace")
            )

        for part in payload.get("parts", []):
            self._walk_parts(part, text_parts, html_parts, attachments, _counter)

    # -------------------------
    # ATTACHMENT DOWNLOAD
    # -------------------------
    def get_attachment(self, message_id, gmail_attachment_id=None, inline_data=None):
        """
        Fetches the raw bytes of a single attachment from Gmail.

        Callers must supply exactly one of:
        - `gmail_attachment_id`: a real Gmail attachmentId (freshly
          looked up via find_attachment_meta — never trust one cached
          from an earlier response, since Gmail doesn't guarantee it
          stays valid-looking-up-by-equality across calls).
        - `inline_data`: base64url data Gmail already embedded directly
          in the message because the attachment was small enough that
          Gmail never assigned it an attachmentId at all.
        """
        if inline_data is not None:
            return base64.urlsafe_b64decode(inline_data)

        try:
            attachment = (
                self.service.users()
                .messages()
                .attachments()
                .get(
                    userId=USER_ID,
                    messageId=message_id,
                    id=gmail_attachment_id,
                )
                .execute()
            )

            data = attachment.get("data", "")
            return base64.urlsafe_b64decode(data)

        except HttpError as error:
            logger.exception("Failed to fetch attachment.")
            raise APIException(str(error))

    def find_attachment_meta(self, message_id, attachment_id):
        """
        Re-reads the message and returns the filename/mime type/current
        download reference for a given (positional) attachment_id, so
        downloads always use Gmail's own record of the attachment rather
        than trusting a client-supplied filename (which could be used
        for header injection) — and, importantly, use a *freshly fetched*
        attachmentId rather than one the client saw earlier, since Gmail
        doesn't guarantee that value stays the same between calls.
        """
        try:
            message = (
                self.service.users()
                .messages()
                .get(
                    userId=USER_ID,
                    id=message_id,
                    format="full",
                )
                .execute()
            )
        except HttpError as error:
            logger.exception("Failed to fetch message for attachment lookup.")
            raise APIException(str(error))

        _, _, attachments = self.extract_content(message["payload"])

        for attachment in attachments:
            if attachment["attachment_id"] == attachment_id:
                return attachment

        return None

    # -------------------------
    # MESSAGE BUILDING (with attachments)
    # -------------------------
    def _build_mime_message(self, to, subject, body, attachments=None):
        """
        Builds a MIME message. When attachments are provided (a list
        of dicts with "filename", "content_type", and "content" raw
        bytes) this produces a multipart message with each file
        attached; otherwise it falls back to a plain text message.
        """
        if attachments:
            message = MIMEMultipart()
            message.attach(MIMEText(body))
        else:
            message = MIMEText(body)

        message["To"] = to
        message["Subject"] = subject

        for attachment in attachments or []:
            filename = attachment["filename"]
            content = attachment["content"]
            content_type = attachment.get("content_type") or "application/octet-stream"

            if "/" in content_type:
                maintype, subtype = content_type.split("/", 1)
            else:
                maintype, subtype = "application", "octet-stream"

            if maintype == "image":
                part = MIMEImage(content, _subtype=subtype)
            elif content_type == "application/pdf":
                part = MIMEApplication(content, _subtype="pdf")
            elif maintype == "application":
                part = MIMEApplication(content, _subtype=subtype)
            else:
                part = MIMEBase(maintype, subtype)
                part.set_payload(content)
                encoders.encode_base64(part)

            part.add_header(
                "Content-Disposition",
                "attachment",
                filename=filename,
            )
            message.attach(part)

        return message

    # -------------------------
    # SEND EMAIL
    # -------------------------
    def send_email(self, to: str, subject: str, body: str, attachments=None):
        try:
            message = self._build_mime_message(to, subject, body, attachments)

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
    def reply_email(self, thread_id, to, subject, body, attachments=None):
        try:
            message = self._build_mime_message(to, subject, body, attachments)

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
    # -------------------------
    # RESTORE EMAIL (out of Trash)
    # -------------------------
    def restore_email(self, message_id):
        try:
            # messages.untrash() alone isn't reliable about restoring
            # the INBOX label — it only guarantees TRASH is removed.
            # Doing it explicitly via modify() guarantees both in one
            # atomic call: TRASH off, INBOX back on.
            self.service.users().messages().modify(
                userId=USER_ID,
                id=message_id,
                body={
                    "removeLabelIds": ["TRASH"],
                    "addLabelIds": ["INBOX"],
                },
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