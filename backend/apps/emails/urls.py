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
    TrashAPIView,
    RestoreEmailAPIView,
    PermanentDeleteEmailAPIView,
    EmptyTrashAPIView,
    ContactSuggestionsAPIView,
    DownloadAttachmentAPIView,
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
        "trash/",
        TrashAPIView.as_view(),
        name="list-trash"
    ),

    path(
        "trash/empty/",
        EmptyTrashAPIView.as_view(),
        name="empty-trash"
    ),

    path(
        "restore/",
        RestoreEmailAPIView.as_view(),
        name="restore-email"
    ),

    path(
        "permanent-delete/",
        PermanentDeleteEmailAPIView.as_view(),
        name="permanent-delete-email"
    ),

    path(
        "<str:message_id>/attachments/<str:attachment_id>/",
        DownloadAttachmentAPIView.as_view(),
        name="download-attachment"
    ),

    path(
        "<str:message_id>/",
        ReadEmailAPIView.as_view(),
        name="read-email"
    ),

]