from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.emails.utils import get_gmail_service

from .serializers import SummarizeEmailSerializer, GenerateReplySerializer
from .summarizer import EmailSummarizer
from .reply_generator import EmailReplyGenerator



class SummarizeEmailAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = SummarizeEmailSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        gmail = get_gmail_service(request)

        email = gmail.read_email(
            serializer.validated_data["message_id"]
        )

        summary = EmailSummarizer().summarize(
            email["body"]
        )

        return Response({
            "message_id": email["id"],
            "summary": summary
        })
        
class GenerateReplyAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = GenerateReplySerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        gmail = get_gmail_service(request)

        email = gmail.read_email(
            serializer.validated_data["message_id"]
        )

        reply = EmailReplyGenerator().generate(
            email["body"]
        )

        return Response({
            "message_id": email["id"],
            "reply": reply
        })
        
        



from apps.ai.decision_engine import DecisionEngine


class TestDecisionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message_id = request.data.get("message_id")

        gmail = get_gmail_service(request)

        email = gmail.read_email(message_id)

        decision = DecisionEngine().analyze(email["body"])

        return Response({
            "subject": email["subject"],
            "from": email["from"],
            "decision": decision
        })