from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "profile_picture",
            "gmail_connected",
            "date_joined",
            "last_login",
        )
        read_only_fields = (
            "email",
            "profile_picture",
            "gmail_connected",
            "date_joined",
            "last_login",
        )


class UpdateProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = (
            "username",
            "first_name",
            "last_name",
        )