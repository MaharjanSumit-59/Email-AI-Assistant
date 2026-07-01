from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .serializers import (
    UserSerializer,
    UpdateProfileSerializer,
)

from .services import (
    get_profile,
    update_profile,
    account_status,
    summary,
    delete_account,
)


class ProfileAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        serializer = UserSerializer(
            get_profile(request.user)
        )

        return Response(serializer.data)


    def patch(self, request):

        serializer = UpdateProfileSerializer(
            request.user,
            data=request.data,
            partial=True
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = update_profile(
            request.user,
            serializer.validated_data
        )

        return Response(
            UserSerializer(user).data
        )


class AccountStatusAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        return Response(
            account_status(request.user)
        )


class UserSummaryAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        return Response(
            summary(request.user)
        )


class DeleteAccountAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def delete(self, request):

        data = delete_account(request.user)

        return Response(
            data,
            status=status.HTTP_200_OK
        )