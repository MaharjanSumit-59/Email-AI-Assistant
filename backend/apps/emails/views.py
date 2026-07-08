from email.utils import getaddresses

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

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

    FOLDER_LABELS = {
        "inbox": ["INBOX"],
        "sent": ["SENT"],
    }

    def get(self, request):

        gmail = get_gmail_service(request)

        folder = request.query_params.get("folder", "inbox").lower()
        label_ids = self.FOLDER_LABELS.get(folder, ["INBOX"])

        messages = gmail.fetch_inbox(max_results=25, label_ids=label_ids)

        message_ids = [message["id"] for message in messages]

        metadata_by_id = gmail.get_messages_metadata_batch(message_ids)

        saved_emails = []

        for message in messages:

            metadata = metadata_by_id.get(message["id"])

            if metadata is None:
                # This one message failed in the batch — skip it rather
                # than failing the whole inbox load.
                continue

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

        message_ids = [message["id"] for message in messages]

        metadata_by_id = gmail.get_messages_metadata_batch(message_ids)

        emails = []

        for message in messages:

            metadata = metadata_by_id.get(message["id"])

            if metadata is None:
                continue

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
    """
    Moves an email to Trash. This mirrors clicking the trash icon in
    Gmail: the message isn't gone, it just moves to the TRASH label
    and Gmail (and now our own auto-clear job) will get rid of it for
    good after the retention window passes.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = EmailActionSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        message_id = serializer.validated_data["message_id"]

        gmail = get_gmail_service(request)

        result = gmail.delete_email(message_id)

        # Keep the local row (don't delete it) so it can be listed in
        # the Trash view and timed for auto-clear. If we've never
        # seen this message locally before (e.g. it was trashed
        # straight from a search result), there's nothing to update —
        # it'll get picked up the next time the Trash view syncs.
        EmailMetadata.objects.filter(
            gmail_message_id=message_id
        ).update(
            is_trashed=True,
            trashed_at=timezone.now(),
        )

        return Response(
            result,
            status=status.HTTP_200_OK
        )


class TrashAPIView(APIView):
    """
    Lists everything in Trash, synced against Gmail's own TRASH label
    so it stays correct even if something was trashed, restored, or
    permanently deleted outside our app (e.g. directly in Gmail).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):

        gmail = get_gmail_service(request)

        messages = gmail.fetch_inbox(max_results=50, label_ids=["TRASH"])

        message_ids = [message["id"] for message in messages]

        metadata_by_id = gmail.get_messages_metadata_batch(message_ids)

        retention_days = request.user.trash_retention_days

        trashed_emails = []

        for message in messages:

            metadata = metadata_by_id.get(message["id"])

            if metadata is None:
                continue

            headers = parse_headers(
                metadata["payload"]["headers"]
            )

            existing = EmailMetadata.objects.filter(
                gmail_message_id=metadata["id"]
            ).first()

            # Gmail doesn't tell us *when* a message was trashed, so
            # we only stamp trashed_at the first time we notice it —
            # every later sync keeps the original timestamp, which is
            # what the auto-clear countdown is based on.
            trashed_at = (
                existing.trashed_at
                if existing and existing.trashed_at
                else timezone.now()
            )

            email, _ = EmailMetadata.objects.update_or_create(
                gmail_message_id=metadata["id"],
                defaults={
                    "user": request.user,
                    "thread_id": metadata["threadId"],
                    "subject": headers["subject"],
                    "sender": headers["sender"],
                    "receiver": headers["receiver"],
                    "snippet": metadata.get("snippet", ""),
                    "starred": "STARRED" in metadata.get("labelIds", []),
                    "received_at": headers["received_at"],
                    "is_trashed": True,
                    "trashed_at": trashed_at,
                }
            )

            days_remaining = retention_days - (
                timezone.now() - email.trashed_at
            ).days

            trashed_emails.append({
                "id": email.id,
                "gmail_message_id": email.gmail_message_id,
                "thread_id": email.thread_id,
                "subject": email.subject,
                "sender": email.sender,
                "receiver": email.receiver,
                "snippet": email.snippet,
                "starred": email.starred,
                "received_at": email.received_at,
                "trashed_at": email.trashed_at,
                "days_remaining": max(days_remaining, 0),
            })

        # Reconcile: anything we still have flagged locally as
        # trashed but that no longer showed up in Gmail's TRASH label
        # must have been restored or permanently deleted elsewhere —
        # clear the local flag so it doesn't linger in our list.
        EmailMetadata.objects.filter(
            user=request.user,
            is_trashed=True,
        ).exclude(
            gmail_message_id__in=message_ids
        ).update(
            is_trashed=False,
            trashed_at=None,
        )

        return Response(
            {
                "retention_days": retention_days,
                "emails": trashed_emails,
            },
            status=status.HTTP_200_OK
        )


class RestoreEmailAPIView(APIView):
    """
    Takes an email back out of Trash and returns it to the inbox.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = EmailActionSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        message_id = serializer.validated_data["message_id"]

        gmail = get_gmail_service(request)

        result = gmail.restore_email(message_id)

        EmailMetadata.objects.filter(
            gmail_message_id=message_id
        ).update(
            is_trashed=False,
            trashed_at=None,
        )

        return Response(
            result,
            status=status.HTTP_200_OK
        )


class PermanentDeleteEmailAPIView(APIView):
    """
    "Delete forever" — irreversible, same as emptying a single item
    out of Gmail's Trash by hand.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = EmailActionSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        message_id = serializer.validated_data["message_id"]

        gmail = get_gmail_service(request)

        result = gmail.permanently_delete_email(message_id)

        EmailMetadata.objects.filter(
            gmail_message_id=message_id
        ).delete()

        return Response(
            result,
            status=status.HTTP_200_OK
        )


class EmptyTrashAPIView(APIView):
    """
    Permanently deletes everything currently in Trash for this user.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):

        gmail = get_gmail_service(request)

        trashed = EmailMetadata.objects.filter(
            user=request.user,
            is_trashed=True,
        )

        cleared = []
        failed = []

        for email in trashed:
            try:
                gmail.permanently_delete_email(email.gmail_message_id)
                cleared.append(email.gmail_message_id)
            except Exception:
                failed.append(email.gmail_message_id)

        EmailMetadata.objects.filter(
            gmail_message_id__in=cleared
        ).delete()

        return Response(
            {
                "cleared": len(cleared),
                "failed": failed,
            },
            status=status.HTTP_200_OK
        )
        )


class ContactSuggestionsAPIView(APIView):
    """
    Returns email addresses this user has previously exchanged mail
    with (from the locally cached EmailMetadata rows — both people who
    sent them mail and people they've sent mail to), for autocomplete
    in the Compose "To" field.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):

        pairs = EmailMetadata.objects.filter(
            user=request.user
        ).values_list("sender", "receiver")

        raw_headers = []

        for sender, receiver in pairs:
            if sender:
                raw_headers.append(sender)
            if receiver:
                raw_headers.append(receiver)

        own_email = (request.user.email or "").strip().lower()

        contacts = {}

        for name, address in getaddresses(raw_headers):
            address = address.strip().lower()

            if not address or "@" not in address:
                continue

            if address == own_email:
                continue

            name = name.strip()

            # Prefer keeping a display name if we find one, even if an
            # earlier occurrence of this address had none.
            if address not in contacts or (name and not contacts[address]):
                contacts[address] = name

        results = [
            {"email": address, "name": name}
            for address, name in contacts.items()
        ]

        results.sort(key=lambda c: (c["name"] or c["email"]).lower())

        return Response(results[:200])
