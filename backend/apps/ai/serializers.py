from rest_framework import serializers


class SummarizeEmailSerializer(serializers.Serializer):
    message_id = serializers.CharField()
    
class GenerateReplySerializer(serializers.Serializer):
    message_id = serializers.CharField()