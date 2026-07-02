from django.urls import path

from .views import SummarizeEmailAPIView, GenerateReplyAPIView, TestDecisionAPIView, AnalyzeEmailAPIView, ExtractTasksAPIView

urlpatterns = [
    path(
        "summarize/",
        SummarizeEmailAPIView.as_view(),
        name="summarize-email",
    ),
    path(
    "reply/",
    GenerateReplyAPIView.as_view(),
    name="generate-reply",
),
    
    path(
    "test-decision/",
    TestDecisionAPIView.as_view(),
    name="test-decision",
),
    
    path(
    "analyze/",
    AnalyzeEmailAPIView.as_view(),
),
    path(
    "tasks/",
    ExtractTasksAPIView.as_view(),
),
]