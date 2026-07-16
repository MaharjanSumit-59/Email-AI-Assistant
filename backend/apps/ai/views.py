from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from apps.emails.models import EmailMetadata
from apps.emails.utils import get_gmail_service

from .utils import get_email_metadata
from .serializers import MessageIDSerializer, EmailActionLogSerializer
from .summarizer import EmailSummarizer
from .reply_generator import EmailReplyGenerator
from .decision_engine import DecisionEngine
from .extractor import TaskExtractor
from .models import EmailActionLog
from .automation import EmailAutomationEngine
from .attachment_reader import AttachmentReader

from .translator import EmailTranslator
from .models import EmailActionLog


def _read_attachments(gmail, message_id, email, include_attachments):
    """
    Shared by every AI view below: when the email has attachments and
    the caller hasn't opted out, downloads and reads the supported
    ones (images/PDFs/.docx) so they can be passed into the Gemini
    call alongside the email body.

    Returns (parts, attachment_context, skipped_filenames,
    analyzed_filenames) — all empty when there's nothing to read or
    the caller opted out.
    """
    attachments = email.get("attachments") or []

    if not include_attachments or not attachments:
        return [], "", [], []

    return AttachmentReader(gmail).read(message_id, attachments)


class SummarizeEmailAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = MessageIDSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        message_id = serializer.validated_data["message_id"]
        include_attachments = serializer.validated_data["include_attachments"]

        gmail = get_gmail_service(request)

        email = gmail.read_email(message_id)

        email_metadata = get_email_metadata(
            request.user,
            message_id,
        )

        parts, attachment_context, skipped_attachments, analyzed_attachments = _read_attachments(
            gmail, message_id, email, include_attachments,
        )

        summary = EmailSummarizer().summarize(
            email_metadata,
            email["body"],
            parts=parts,
            attachment_context=attachment_context,
        )

        return Response(
            {
                "message_id": message_id,
                "summary": summary,
                "attachments_analyzed": analyzed_attachments,
                "attachments_skipped": skipped_attachments,
            }
        )


class GenerateReplyAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = MessageIDSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        message_id = serializer.validated_data["message_id"]
        include_attachments = serializer.validated_data["include_attachments"]

        gmail = get_gmail_service(request)

        email = gmail.read_email(message_id)

        email_metadata = get_email_metadata(
            request.user,
            message_id,
        )

        parts, attachment_context, skipped_attachments, analyzed_attachments = _read_attachments(
            gmail, message_id, email, include_attachments,
        )

        reply = EmailReplyGenerator().generate(
            email_metadata,
            email["body"],
            parts=parts,
            attachment_context=attachment_context,
        )

        return Response(
            {
                "message_id": message_id,
                "reply": reply,
                "attachments_analyzed": analyzed_attachments,
                "attachments_skipped": skipped_attachments,
            }
        )


class TestDecisionAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = MessageIDSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        message_id = serializer.validated_data["message_id"]

        gmail = get_gmail_service(request)

        email = gmail.read_email(message_id)

        email_metadata = get_email_metadata(
            request.user,
            message_id,
        )

        decision = DecisionEngine().analyze(
            email_metadata,
            email["body"],
        )

        return Response(
            {
                "subject": email["subject"],
                "from": email["from"],
                "decision": decision,
            }
        )
        

class AnalyzeEmailAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = MessageIDSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        message_id = serializer.validated_data["message_id"]
        include_attachments = serializer.validated_data["include_attachments"]

        gmail = get_gmail_service(request)

        email = gmail.read_email(message_id)

        email_metadata = get_email_metadata(
            request.user,
            message_id,
        )

        parts, attachment_context, skipped_attachments, analyzed_attachments = _read_attachments(
            gmail, message_id, email, include_attachments,
        )

        decision = DecisionEngine().analyze(
            email_metadata,
            email["body"],
        )

        summary = EmailSummarizer().summarize(
            email_metadata,
            email["body"],
            parts=parts,
            attachment_context=attachment_context,
        )

        reply = EmailReplyGenerator().generate(
            email_metadata,
            email["body"],
            parts=parts,
            attachment_context=attachment_context,
        )

        tasks = TaskExtractor().extract(
            email_metadata,
            email["body"],
            parts=parts,
            attachment_context=attachment_context,
        )

        return Response(
            {
                "message_id": message_id,
                "subject": email["subject"],
                "from": email["from"],
                "summary": summary,
                "reply": reply,
                "decision": decision,
                "tasks": tasks,
                "attachments_analyzed": analyzed_attachments,
                "attachments_skipped": skipped_attachments,
            }
        )
    
class ExtractTasksAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = MessageIDSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        message_id = serializer.validated_data["message_id"]
        include_attachments = serializer.validated_data["include_attachments"]

        gmail = get_gmail_service(request)

        email = gmail.read_email(message_id)

        email_metadata = get_email_metadata(
            request.user,
            message_id,
        )

        parts, attachment_context, skipped_attachments, analyzed_attachments = _read_attachments(
            gmail, message_id, email, include_attachments,
        )

        tasks = TaskExtractor().extract(
            email_metadata,
            email["body"],
            parts=parts,
            attachment_context=attachment_context,
        )

        return Response(
            {
                "message_id": message_id,
                "tasks": tasks,
                "attachments_analyzed": analyzed_attachments,
                "attachments_skipped": skipped_attachments,
            }
        )


class EmailActionLogListAPIView(APIView):
    """
    Returns the automation audit trail (newest first) for the
    logged-in user: every email the automation engine looked at, what
    it decided, and what it did about it (auto-replied / drafted /
    skipped / failed). Optional ?action=auto_replied|draft_created|
    skipped|failed to filter down to one bucket.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):

        logs = EmailActionLog.objects.filter(
            email__user=request.user
        ).select_related("email")

        action_filter = request.query_params.get("action")

        if action_filter:
            logs = logs.filter(action=action_filter)

        limit = int(request.query_params.get("limit", 50))
        limit = max(1, min(limit, 200))

        serializer = EmailActionLogSerializer(
            logs[:limit],
            many=True,
        )

        return Response(serializer.data)


class EmailActionLogDeleteAPIView(APIView):
    """
    Permanently deletes one automation log entry. This only removes
    the audit-trail row itself — it has nothing to do with Gmail
    Trash and does not touch the underlying email or draft.
    """

    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):

        log = EmailActionLog.objects.filter(
            id=pk,
            email__user=request.user,
        ).first()

        if log is None:
            return Response(
                {"detail": "Log entry not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        log.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

class RunAutomationNowAPIView(APIView):
    """
    Lets a user trigger an automation sweep of their own inbox on
    demand, instead of waiting for the next scheduled run. Runs
    synchronously so the response reflects what just happened.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):

        if not request.user.gmail_connected:
            return Response(
                {"detail": "Connect Gmail before running automation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        EmailAutomationEngine(request.user).run(force=True)

        return Response({"status": "completed"})
    
class TranslateEmailAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = MessageIDSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        message_id = serializer.validated_data["message_id"]

        gmail = get_gmail_service(request)

        email = gmail.read_email(message_id)

        email_metadata = get_email_metadata(
            request.user,
            message_id,
        )

        translation = EmailTranslator().translate(
            email_metadata,
            email["body"],
        )

        return Response(
            {
                "message_id": message_id,
                "original_body": email["body"],
                "detected_language": translation["detected_language"],
                "translated_body": translation["translated_text"],
            }
        )