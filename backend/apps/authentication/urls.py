# this is the urls.py file for the authentication app
from django.urls import path
from .views import GoogleLoginView, GoogleCallbackView

urlpatterns = [
    path("google/", GoogleLoginView.as_view()),
    path("callback/", GoogleCallbackView.as_view()),
]