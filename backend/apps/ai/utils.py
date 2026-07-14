from rest_framework.exceptions import NotFound

from apps.emails.models import EmailMetadata


def get_email_metadata(user, message_id):

    try:

        return EmailMetadata.objects.get(
            gmail_message_id=message_id,
            user=user,
        )

    except EmailMetadata.DoesNotExist:

        raise NotFound(
            "Email not found. Please sync inbox first."
        )