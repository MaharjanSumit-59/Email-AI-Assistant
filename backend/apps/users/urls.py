from django.urls import path
from .views import (
    ProfileAPIView,
    AccountStatusAPIView,
    UserSummaryAPIView,
    DeleteAccountAPIView,
)

urlpatterns = [
    path("me/", ProfileAPIView.as_view(), name="profile"),
    path("status/", AccountStatusAPIView.as_view(), name="account-status"),
    path("summary/", UserSummaryAPIView.as_view(), name="summary"),
    path("delete/", DeleteAccountAPIView.as_view(), name="delete-account"),
]