from django.shortcuts import redirect
from django.http import JsonResponse
from django.conf import settings

from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from .services import (
    build_google_auth_url,
    exchange_code_for_token,
    get_google_user,
    create_or_update_user,
    save_google_tokens,
    generate_jwt,
)


class GoogleLoginView(APIView):

    permission_classes = [AllowAny]

    def get(self, request):

        return redirect(
            build_google_auth_url()
        )


class GoogleCallbackView(APIView):

    permission_classes = [AllowAny]

    def get(self, request):

        code = request.GET.get("code")

        tokens = exchange_code_for_token(code)

        google_user = get_google_user(
            tokens["access_token"]
        )

        user = create_or_update_user(
            google_user
        )

        save_google_tokens(
            user,
            tokens
        )

        tokens = generate_jwt(user)

        frontend_url = (
            f"{settings.FRONTEND_URL}/auth/success"
        )

        return redirect(
            f"{frontend_url}?token={tokens['access']}&refresh={tokens['refresh']}"
        )