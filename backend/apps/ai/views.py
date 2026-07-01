from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from apps.emails.models import EmailMetadata
from apps.emails.utils import get_gmail_service

from .utils import get_email_metadata
from .serializers import MessageIDSerializer
from .summarizer import EmailSummarizer
from .reply_generator import EmailReplyGenerator
from .decision_engine import DecisionEngine


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

        return Response(
            {
                "message_id": message_id,
                "subject": email["subject"],
                "from": email["from"],
                "summary": summary,
                "reply": reply,
                "decision": decision,
            }
        )