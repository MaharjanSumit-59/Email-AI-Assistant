from django.urls import path

from .views import (
    ReminderListCreateView,
    ReminderDetailView,
)

urlpatterns = [

    path(
        "",
        ReminderListCreateView.as_view(),
        name="reminder-list-create",
    ),

    path(
        "<int:pk>/",
        ReminderDetailView.as_view(),
        name="reminder-detail",
    ),

]