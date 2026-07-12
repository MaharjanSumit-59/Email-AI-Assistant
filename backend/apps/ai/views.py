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

from .translator import EmailTranslator


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

        gmail = get_gmail_service(request)

        email = gmail.read_email(message_id)

        email_metadata = get_email_metadata(
            request.user,
            message_id,
        )
        summary = EmailSummarizer().summarize(
            email_metadata,
            email["body"],
        )

        return Response(
            {
                "message_id": message_id,
                "summary": summary,
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

        gmail = get_gmail_service(request)

        email = gmail.read_email(message_id)

        email_metadata = get_email_metadata(
            request.user,
            message_id,
        )
        reply = EmailReplyGenerator().generate(
            email_metadata,
            email["body"],
        )

        return Response(
            {
                "message_id": message_id,
                "reply": reply,
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

        summary = EmailSummarizer().summarize(
            email_metadata,
            email["body"],
        )

        reply = EmailReplyGenerator().generate(
            email_metadata,
            email["body"],
        )
        
        tasks = TaskExtractor().extract(
            email_metadata,
            email["body"],
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

        gmail = get_gmail_service(request)

        email = gmail.read_email(message_id)

        email_metadata = get_email_metadata(
            request.user,
            message_id,
        )

        tasks = TaskExtractor().extract(
            email_metadata,
            email["body"],
        )

        return Response(
            {
                "message_id": message_id,
                "tasks": tasks,
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