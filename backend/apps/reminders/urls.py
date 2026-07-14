from django.urls import path

from .views import (
    ReminderListCreateView,
    ReminderDetailView,
    ConfirmReminderView,
    CheckConflictsView,
)

urlpatterns = [

    path(
        "",
        ReminderListCreateView.as_view(),
        name="reminder-list-create",
    ),

    path(
        "check-conflicts/",
        CheckConflictsView.as_view(),
        name="reminder-check-conflicts",
    ),

    path(
        "<int:pk>/",
        ReminderDetailView.as_view(),
        name="reminder-detail",
    ),

    path(
        "<int:pk>/confirm/",
        ConfirmReminderView.as_view(),
        name="reminder-confirm",
    ),

]