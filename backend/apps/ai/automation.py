import logging
from email.utils import parseaddr, parsedate_to_datetime

from django.utils import timezone

from apps.emails.models import EmailMetadata
from apps.emails.services.gmail_service import GmailService

from .decision_engine import DecisionEngine
from .reply_generator import EmailReplyGenerator
from .models import EmailActionLog


logger = logging.getLogger(__name__)


class EmailAutomationEngine:
    """
    Runs the "hands-free" pipeline for one user's inbox.

    For every new email it hasn't seen before, it:
      1. Classifies the email (category / priority / importance / action)
         using the existing DecisionEngine.
      2. If the email is routine and the model marked it safe to
         auto-send, generates a reply and sends it immediately.
      3. Otherwise (anything "Important", or anything the model isn't
         confident enough to send on its own) generates a reply and
         saves it as a Gmail draft so the user can review, edit, and
         send it themselves.
      4. Logs every decision (and any failure) to EmailActionLog.

    Importance always wins over the model's suggested action: an
    email marked "Important" is never auto-sent, even if the
    classifier suggested "auto_send".
    """

    def __init__(self, user):
        self.user = user
        self.gmail = GmailService(user)
        self.decision_engine = DecisionEngine()
        self.reply_generator = EmailReplyGenerator()

    # ------------------------------------------------------------
    # ENTRY POINT
    # ------------------------------------------------------------
    def run(self, max_results=15, force=False):

        if not force and not getattr(self.user, "automation_enabled", True):
            return

        messages = self.gmail.fetch_inbox(max_results=max_results)

        for message in messages:
            try:
                self._process_message(message["id"])
            except Exception:
                logger.exception(
                    "Automation pipeline crashed for message %s (user %s)",
                    message["id"],
                    self.user.id,
                )

    # ------------------------------------------------------------
    # PER-MESSAGE PIPELINE
    # ------------------------------------------------------------
    def _process_message(self, message_id):

        existing = EmailMetadata.objects.filter(
            gmail_message_id=message_id,
            user=self.user,
        ).first()

        if existing and existing.ai_processed:
            return

        email = self.gmail.read_email(message_id)

        email_metadata = self._save_metadata(email)

        sender_address = parseaddr(email.get("from", ""))[1]

        if sender_address and sender_address.lower() == (self.user.email or "").lower():
            self._log(
                email_metadata,
                action="skipped",
                reasoning="Email was sent by the account owner; nothing to reply to.",
            )
            self._mark_processed(email_metadata)
            return

        try:
            decision = self.decision_engine.analyze(
                email_metadata,
                email["body"],
            )
        except Exception as e:
            self._log(
                email_metadata,
                action="failed",
                error_message=f"Classification failed: {e}",
            )
            return

        should_auto_send = (
            decision["action"] == "auto_send"
            and decision["importance"] != "Important"
        )

        try:
            reply = self.reply_generator.generate(
                email_metadata,
                email["body"],
            )
        except Exception as e:
            self._log(
                email_metadata,
                action="failed",
                decision=decision,
                error_message=f"Reply generation failed: {e}",
            )
            return

        reply_to = sender_address or email.get("from", "")
        subject = email.get("subject") or "(no subject)"

        if not subject.lower().startswith("re:"):
            subject = f"Re: {subject}"

        try:
            if should_auto_send:

                self.gmail.reply_email(
                    email["thread_id"],
                    reply_to,
                    subject,
                    reply,
                )

                self._log(
                    email_metadata,
                    action="auto_replied",
                    decision=decision,
                    reply_content=reply,
                    reasoning=(
                        "Classified as routine and safe to answer "
                        "automatically, so the AI sent this reply "
                        "without waiting for review."
                    ),
                )

            else:

                self.gmail.create_draft(
                    email["thread_id"],
                    reply_to,
                    subject,
                    reply,
                )

                self._log(
                    email_metadata,
                    action="draft_created",
                    decision=decision,
                    reply_content=reply,
                    reasoning=(
                        "Marked important or needing your own judgement, "
                        "so the AI left a draft in Gmail for you to review "
                        "and send yourself."
                    ),
                )

        except Exception as e:
            self._log(
                email_metadata,
                action="failed",
                decision=decision,
                reply_content=reply,
                error_message=f"Gmail action failed: {e}",
            )
            return

        self._mark_processed(email_metadata)

    # ------------------------------------------------------------
    # HELPERS
    # ------------------------------------------------------------
    def _save_metadata(self, email):

        received_at = None

        if email.get("date"):
            try:
                received_at = parsedate_to_datetime(email["date"])
            except (TypeError, ValueError):
                received_at = None

        if received_at is None:
            received_at = timezone.now()

        sender = email.get("from", "")
        receiver = email.get("to", "")

        email_metadata, _ = EmailMetadata.objects.update_or_create(
            gmail_message_id=email["id"],
            defaults={
                "user": self.user,
                "thread_id": email["thread_id"],
                "subject": email.get("subject", ""),
                "sender": sender,
                "receiver": receiver,
                "snippet": email.get("snippet") or "",
                "starred": "STARRED" in email.get("label_ids", []),
                "received_at": received_at,
            },
        )

        return email_metadata

    def _mark_processed(self, email_metadata):
        email_metadata.ai_processed = True
        email_metadata.save(update_fields=["ai_processed"])

    def _log(
        self,
        email_metadata,
        action,
        decision=None,
        reply_content="",
        reasoning="",
        error_message="",
    ):
        decision = decision or {}

        EmailActionLog.objects.create(
            email=email_metadata,
            action=action,
            category=decision.get("category", ""),
            priority=decision.get("priority", ""),
            importance=decision.get("importance", ""),
            confidence=decision.get("confidence", 0.0),
            reply_content=reply_content,
            reasoning=reasoning,
            error_message=error_message,
        )
