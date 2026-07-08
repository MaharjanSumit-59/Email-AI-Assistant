from django.urls import path

from .views import (
    InboxAPIView,
    ReadEmailAPIView,
    SendEmailAPIView,
    ReplyEmailAPIView,
    SearchEmailAPIView,
    StarEmailAPIView,
    UnstarEmailAPIView,
    DeleteEmailAPIView,
    ContactSuggestionsAPIView,
)

urlpatterns = [

    path(
        "",
        InboxAPIView.as_view(),
        name="fetch-inbox"
    ),

    path(
        "search/",
        SearchEmailAPIView.as_view(),
        name="search-email"
    ),

    path(
        "contacts/",
        ContactSuggestionsAPIView.as_view(),
        name="contact-suggestions"
    ),

    path(
        "send/",
        SendEmailAPIView.as_view(),
        name="send-email"
    ),

    path(
        "reply/",
        ReplyEmailAPIView.as_view(),
        name="reply-email"
    ),

    path(
        "star/",
        StarEmailAPIView.as_view(),
        name="star-email"
    ),

    path(
        "unstar/",
        UnstarEmailAPIView.as_view(),
        name="unstar-email"
    ),

    path(
        "delete/",
        DeleteEmailAPIView.as_view(),
        name="delete-email"
    ),

    path(
        "<str:message_id>/",
        ReadEmailAPIView.as_view(),
        name="read-email"
    ),

]