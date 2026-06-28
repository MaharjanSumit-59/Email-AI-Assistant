from django.shortcuts import redirect
from rest_framework.views import APIView
from django.http import JsonResponse

from .services import (
    exchange_code_for_token,
    get_google_user,
    build_google_auth_url,
)


class GoogleLoginView(APIView):

    authentication_classes = []
    permission_classes = []

    def get(self, request):

        return redirect(build_google_auth_url())
    
class GoogleCallbackView(APIView):

    authentication_classes = []
    permission_classes = []

    def get(self, request):

        code = request.GET.get("code")

        tokens = exchange_code_for_token(code)

        user = get_google_user(
            tokens["access_token"]
        )

        return JsonResponse({

            "google_user": user,

            "tokens": tokens

        })