from django.shortcuts import redirect
from django.http import JsonResponse

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

        jwt = generate_jwt(user)

        return JsonResponse({

            "message": "Login Successful",

            "user": {

                "email": user.email,

                "first_name": user.first_name,

                "last_name": user.last_name,

                "profile_picture": user.profile_picture,

            },

            "jwt": jwt

        })