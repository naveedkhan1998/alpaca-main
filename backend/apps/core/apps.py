from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"

    def ready(self) -> None:  # noqa: D401
        """Connect signals on app ready."""
        # Import signals to ensure receivers are registered
        from . import signals  # noqa: F401

        return super().ready()
