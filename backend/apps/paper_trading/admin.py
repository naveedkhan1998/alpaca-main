from django.contrib import admin

from .models import PaperTrade


@admin.register(PaperTrade)
class PaperTradeAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "asset",
        "direction",
        "quantity",
        "entry_price",
        "status",
        "exit_price",
        "created_at",
    )
    list_filter = ("status", "direction", "asset")
    search_fields = ("user__email", "asset__symbol")
    ordering = ("-created_at",)
