import requests

from urllib.parse import urlencode

from django.conf import settings



from apps.users.models import User
from .models import GoogleToken

from rest_framework_simplejwt.tokens import RefreshToken
from apps.authentication.models import GoogleToken

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


def build_google_auth_url():

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile https://www.googleapis.com/auth/gmail.modify",
        "access_type": "offline",
        "prompt": "consent",
    }

    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def exchange_code_for_token(code):

    data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    response = requests.post(
        GOOGLE_TOKEN_URL,
        data=data,
    )

    response.raise_for_status()

    return response.json()


def get_google_user(access_token):

    response = requests.get(
        GOOGLE_USERINFO_URL,
        headers={
            "Authorization": f"Bearer {access_token}"
        },
    )

    response.raise_for_status()

    return response.json()


def create_or_update_user(user_info):

    user, created = User.objects.get_or_create(
        email=user_info["email"]
    )

    user.google_id = user_info["id"]

    user.first_name = user_info.get("given_name", "")

    user.last_name = user_info.get("family_name", "")

    user.profile_picture = user_info.get("picture")

    user.gmail_connected = True

    if not user.username:
        user.username = user_info["email"].split("@")[0]

    user.save()

    return user


def save_google_tokens(user, tokens):

    GoogleToken.objects.update_or_create(

        user=user,

        defaults={

            "access_token": tokens["access_token"],

            "refresh_token": tokens.get("refresh_token"),

            "scope": tokens["scope"],

            "token_type": tokens["token_type"],

        }

    )


def generate_jwt(user):

    refresh = RefreshToken.for_user(user)

    return {

        "access": str(refresh.access_token),

        "refresh": str(refresh)

    }