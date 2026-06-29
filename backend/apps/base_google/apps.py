from django.apps import AppConfig


class BaseGoogleConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = 'apps.base_google'
