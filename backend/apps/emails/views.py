from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import EmailMetadata
from .services.gmail_service import GmailService
from .utils import parse_headers, get_gmail_service
from .serializers import (
    EmailMetadataSerializer,
    SendEmailSerializer,
    ReplyEmailSerializer,
    EmailActionSerializer
)


class InboxAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        gmail = get_gmail_service(request)
        

        messages = gmail.fetch_inbox(max_results=20)

        saved_emails = []

        for message in messages:

            metadata = gmail.get_message_metadata(
                message["id"]
            )

            headers = parse_headers(
                metadata["payload"]["headers"]
            )

            email, created = EmailMetadata.objects.update_or_create(

                gmail_message_id=metadata["id"],

                defaults={

                    "user": request.user,

                    "thread_id": metadata["threadId"],

                    "subject": headers["subject"],

                    "sender": headers["sender"],

                    "receiver": headers["receiver"],

                    "snippet": metadata.get("snippet", ""),

                    "starred": "STARRED" in metadata.get(
                        "labelIds",
                        []
                    ),

                    "received_at": headers["received_at"],
                }
            )

            saved_emails.append(email)

        serializer = EmailMetadataSerializer(
            saved_emails,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )
    
class ReadEmailAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request, message_id):

        gmail = get_gmail_service(request)

        email = gmail.read_email(message_id)

        return Response(
            email,
            status=status.HTTP_200_OK
        )
    
class SendEmailAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = SendEmailSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        gmail = get_gmail_service(request)

        result = gmail.send_email(

            serializer.validated_data["to"],

            serializer.validated_data["subject"],

            serializer.validated_data["body"]

        )

        return Response(

            result,

            status=status.HTTP_201_CREATED

        )
    
class ReplyEmailAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = ReplyEmailSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        gmail = get_gmail_service(request)

        result = gmail.reply_email(

            serializer.validated_data["thread_id"],

            serializer.validated_data["to"],

            serializer.validated_data["subject"],

            serializer.validated_data["body"]

        )

        return Response(

            result,

            status=status.HTTP_200_OK

        )
    
class SearchEmailAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        query = request.data.get("query")

        if not query:

            return Response(
                {
                    "error": "'query' is required in the request body."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        gmail = get_gmail_service(request)

        messages = gmail.search_emails(query)

        emails = []

        for message in messages:

            metadata = gmail.get_message_metadata(
                message["id"]
            )

            headers = parse_headers(
                metadata["payload"]["headers"]
            )

            emails.append({

                "gmail_message_id": metadata["id"],

                "thread_id": metadata["threadId"],

                "subject": headers["subject"],

                "sender": headers["sender"],

                "receiver": headers["receiver"],

                "snippet": metadata.get(
                    "snippet",
                    ""
                ),

                "starred": "STARRED" in metadata.get(
                    "labelIds",
                    []
                ),

                "received_at": headers["received_at"]

            })

        return Response(
            emails,
            status=status.HTTP_200_OK
        )
    
class StarEmailAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = EmailActionSerializer(

            data=request.data

        )

        serializer.is_valid(

            raise_exception=True

        )

        gmail = get_gmail_service(request)

        result = gmail.star_email(

            serializer.validated_data["message_id"]

        )

        EmailMetadata.objects.filter(

            gmail_message_id=serializer.validated_data["message_id"]

        ).update(

            starred=True

        )

        return Response(

            result,

            status=status.HTTP_200_OK

        )
    
class UnstarEmailAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = EmailActionSerializer(

            data=request.data

        )

        serializer.is_valid(

            raise_exception=True

        )

        gmail = get_gmail_service(request)

        result = gmail.unstar_email(

            serializer.validated_data["message_id"]

        )

        EmailMetadata.objects.filter(

            gmail_message_id=serializer.validated_data["message_id"]

        ).update(

            starred=False

        )

        return Response(

            result,

            status=status.HTTP_200_OK

        )
    
class DeleteEmailAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = EmailActionSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        gmail = get_gmail_service(request)

        result = gmail.delete_email(

            serializer.validated_data["message_id"]

        )

        EmailMetadata.objects.filter(

            gmail_message_id=serializer.validated_data["message_id"]

        ).delete()

        return Response(

            result,

            status=status.HTTP_200_OK

        )