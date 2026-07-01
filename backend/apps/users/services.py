from django.db.models import Count

from apps.authentication.models import GoogleToken
from apps.emails.models import EmailMetadata


def get_profile(user):
    return user


def update_profile(user, data):

    user.username = data.get("username", user.username)
    user.first_name = data.get("first_name", user.first_name)
    user.last_name = data.get("last_name", user.last_name)

    user.save()

    return user


def account_status(user):

    return {
        "gmail_connected": user.gmail_connected,
        "email": user.email,
        "date_joined": user.date_joined,
        "last_login": user.last_login,
    }


def summary(user):

    total = EmailMetadata.objects.filter(user=user).count()

    starred = EmailMetadata.objects.filter(
        user=user,
        starred=True
    ).count()

    return {
        "total_emails": total,
        "starred_emails": starred,
        "gmail_connected": user.gmail_connected,
    }



def delete_account(user):

    GoogleToken.objects.filter(user=user).delete()

    EmailMetadata.objects.filter(user=user).delete()

    user.delete()

    return {
        "message": "Account deleted successfully."
    }