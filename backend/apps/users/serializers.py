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
            "automation_enabled",
            "trash_retention_days",
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

    trash_retention_days = serializers.IntegerField(
        min_value=1,
        max_value=365,
        required=False,
    )

    class Meta:
        model = User
        fields = (
            "username",
            "first_name",
            "last_name",
            "automation_enabled",
            "trash_retention_days",
        )