from rest_framework import serializers

from .models import EmailMetadata


class EmailMetadataSerializer(serializers.ModelSerializer):

    class Meta:
        model = EmailMetadata
        fields = [
            "id",
            "gmail_message_id",
            "thread_id",
            "subject",
            "sender",
            "receiver",
            "snippet",
            "category",
            "priority",
            "starred",
            "received_at",
        ]

# DRF automatically validates required feilds, email format, empty values, maxium length
class SendEmailSerializer(serializers.Serializer):

    to = serializers.EmailField()

    subject = serializers.CharField(
        max_length=255
    )

    body = serializers.CharField()

# every gmail conversation has a unique threadId
class ReplyEmailSerializer(serializers.Serializer):

    thread_id = serializers.CharField()

    to = serializers.EmailField()

    subject = serializers.CharField(
        max_length=255
    )

    body = serializers.CharField()


class EmailActionSerializer(serializers.Serializer):

    message_id = serializers.CharField()