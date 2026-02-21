from django.conf import settings
from django.contrib import admin, messages
from django.http import JsonResponse
from django.urls import path, reverse
from django.utils.html import format_html

from apps.core.models import (
    AggregatedCandle,
    AlpacaAccount,
    Asset,
    Candle,
    DataRefreshBatch,
    DataRefreshTask,
    MinuteCandle,
    Tick,
    WatchList,
    WatchListAsset,
)


@admin.register(MinuteCandle)
class MinuteCandleAdmin(admin.ModelAdmin):
    """Admin for 1-minute candle data."""

    list_display = ["asset", "timestamp", "open", "high", "low", "close", "volume"]
    list_filter = ["asset__asset_class"]
    search_fields = ["asset__symbol"]
    date_hierarchy = "timestamp"
    ordering = ["-timestamp"]
    readonly_fields = ["created_at"]
    raw_id_fields = ["asset"]


@admin.register(AggregatedCandle)
class AggregatedCandleAdmin(admin.ModelAdmin):
    """Admin for aggregated candle data (5T+)."""

    list_display = [
        "asset",
        "timeframe",
        "timestamp",
        "open",
        "high",
        "low",
        "close",
        "volume",
    ]
    list_filter = ["timeframe", "asset__asset_class"]
    search_fields = ["asset__symbol"]
    date_hierarchy = "timestamp"
    ordering = ["-timestamp"]
    readonly_fields = ["created_at"]
    raw_id_fields = ["asset"]


# ---------------------------------------------------------------------------
# WatchList admin with data-refresh actions
# ---------------------------------------------------------------------------


class WatchListAssetInline(admin.TabularInline):
    model = WatchListAsset
    extra = 0
    raw_id_fields = ["asset"]
    readonly_fields = ["added_at"]


@admin.register(WatchList)
class WatchListAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "user",
        "is_active",
        "is_default",
        "asset_count",
        "created_at",
    ]
    list_filter = ["is_active", "is_default"]
    search_fields = ["name", "user__email"]
    inlines = [WatchListAssetInline]
    actions = [
        "refresh_minute_data",
        "refresh_timeframe_data",
        "refresh_full_data",
    ]

    def asset_count(self, obj):
        return obj.watchlistasset_set.filter(is_active=True).count()

    asset_count.short_description = "Active Assets"

    def _dispatch_refresh(self, request, queryset, refresh_type):
        """Common logic to create a batch and dispatch per-asset Celery tasks."""
        from apps.core.tasks import (
            refresh_asset_full_data,
            refresh_asset_minute_data,
            refresh_asset_timeframe_data,
        )

        task_func_map = {
            "minute": refresh_asset_minute_data,
            "timeframe": refresh_asset_timeframe_data,
            "full": refresh_asset_full_data,
        }
        task_func = task_func_map[refresh_type]
        window_days = settings.HISTORIC_DATA_LOADING_LIMIT

        # Collect unique active assets from selected watchlists
        asset_ids = set(
            WatchListAsset.objects.filter(
                watchlist__in=queryset,
                is_active=True,
                watchlist__is_active=True,
            ).values_list("asset_id", flat=True)
        )

        if not asset_ids:
            self.message_user(
                request,
                "No active assets found in the selected watchlists.",
                messages.WARNING,
            )
            return

        batch = DataRefreshBatch.objects.create(
            refresh_type=refresh_type,
            total_assets=len(asset_ids),
            data_window_days=window_days,
            triggered_by=request.user,
            status="running",
        )

        for asset_id in asset_ids:
            task_obj = DataRefreshTask.objects.create(
                batch=batch,
                asset_id=asset_id,
            )
            result = task_func.delay(task_obj.id)
            task_obj.celery_task_id = result.id if result else ""
            task_obj.save(update_fields=["celery_task_id"])

        self.message_user(
            request,
            format_html(
                "Dispatched {} {} tasks for {} assets. "
                '<a href="{}">Track progress &rarr;</a>',
                refresh_type,
                len(asset_ids),
                len(asset_ids),
                reverse("admin:core_datarefreshbatch_change", args=[batch.pk]),
            ),
            messages.SUCCESS,
        )

    @admin.action(description="🔄 Refresh 1-min candle data")
    def refresh_minute_data(self, request, queryset):
        self._dispatch_refresh(request, queryset, "minute")

    @admin.action(description="📊 Refresh timeframe aggregations")
    def refresh_timeframe_data(self, request, queryset):
        self._dispatch_refresh(request, queryset, "timeframe")

    @admin.action(description="⚡ Full refresh (1-min + timeframes)")
    def refresh_full_data(self, request, queryset):
        self._dispatch_refresh(request, queryset, "full")


@admin.register(WatchListAsset)
class WatchListAssetAdmin(admin.ModelAdmin):
    list_display = ["watchlist", "asset", "is_active", "added_at"]
    list_filter = ["is_active", "watchlist"]
    search_fields = ["asset__symbol", "watchlist__name"]
    raw_id_fields = ["asset", "watchlist"]


# ---------------------------------------------------------------------------
# Data Refresh tracking admin
# ---------------------------------------------------------------------------


class DataRefreshTaskInline(admin.TabularInline):
    model = DataRefreshTask
    extra = 0
    readonly_fields = [
        "asset",
        "celery_task_id",
        "status_badge",
        "candles_fetched",
        "timeframes_built",
        "error_message",
        "started_at",
        "completed_at",
    ]
    fields = [
        "asset",
        "status_badge",
        "candles_fetched",
        "timeframes_built",
        "error_message",
        "started_at",
        "completed_at",
    ]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False

    def status_badge(self, obj):
        colors = {
            "pending": "#6c757d",
            "running": "#0d6efd",
            "completed": "#198754",
            "failed": "#dc3545",
        }
        color = colors.get(obj.status, "#6c757d")
        return format_html(
            '<span style="color:white;background:{};padding:2px 8px;'
            'border-radius:4px;font-size:11px;">{}</span>',
            color,
            obj.status.upper(),
        )

    status_badge.short_description = "Status"


@admin.register(DataRefreshBatch)
class DataRefreshBatchAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "refresh_type",
        "status_badge",
        "progress_bar",
        "total_assets",
        "completed_assets",
        "failed_assets",
        "data_window_days",
        "triggered_by",
        "created_at",
        "completed_at",
    ]
    list_filter = ["status", "refresh_type"]
    readonly_fields = [
        "refresh_type",
        "status",
        "total_assets",
        "completed_assets",
        "failed_assets",
        "data_window_days",
        "triggered_by",
        "created_at",
        "updated_at",
        "completed_at",
        "progress_bar_detail",
    ]
    inlines = [DataRefreshTaskInline]

    def has_add_permission(self, request):
        return False

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "<int:batch_id>/progress/",
                self.admin_site.admin_view(self.batch_progress_api),
                name="core_datarefreshbatch_progress",
            ),
        ]
        return custom_urls + urls

    def batch_progress_api(self, request, batch_id):
        """JSON endpoint for AJAX progress polling."""
        try:
            batch = DataRefreshBatch.objects.get(pk=batch_id)
        except DataRefreshBatch.DoesNotExist:
            return JsonResponse({"error": "Not found"}, status=404)

        tasks = batch.tasks.select_related("asset").all()
        return JsonResponse(
            {
                "status": batch.status,
                "progress_pct": batch.progress_pct,
                "total_assets": batch.total_assets,
                "completed_assets": batch.completed_assets,
                "failed_assets": batch.failed_assets,
                "tasks": [
                    {
                        "id": t.id,
                        "symbol": t.asset.symbol,
                        "status": t.status,
                        "candles_fetched": t.candles_fetched,
                        "timeframes_built": t.timeframes_built,
                        "error_message": t.error_message,
                    }
                    for t in tasks
                ],
            }
        )

    def status_badge(self, obj):
        colors = {
            "pending": "#6c757d",
            "running": "#0d6efd",
            "completed": "#198754",
            "failed": "#dc3545",
            "partial": "#fd7e14",
        }
        color = colors.get(obj.status, "#6c757d")
        return format_html(
            '<span style="color:white;background:{};padding:2px 8px;'
            'border-radius:4px;font-size:11px;">{}</span>',
            color,
            obj.status.upper(),
        )

    status_badge.short_description = "Status"

    def progress_bar(self, obj):
        pct = obj.progress_pct
        color = "#198754" if obj.status == "completed" else "#0d6efd"
        if obj.failed_assets > 0:
            color = "#fd7e14"
        return format_html(
            '<div style="width:120px;background:#e9ecef;border-radius:4px;overflow:hidden;">'
            '<div style="width:{}%;background:{};height:18px;text-align:center;'
            'color:white;font-size:11px;line-height:18px;">'
            "{}%</div></div>",
            pct,
            color,
            pct,
        )

    progress_bar.short_description = "Progress"

    def progress_bar_detail(self, obj):
        pct = obj.progress_pct
        return format_html(
            '<div style="width:300px;background:#e9ecef;border-radius:4px;'
            'overflow:hidden;margin-bottom:4px;">'
            '<div style="width:{}%;background:#0d6efd;height:24px;text-align:center;'
            'color:white;font-size:12px;line-height:24px;">'
            "{}%</div></div>"
            "<strong>{}</strong> / {} completed &nbsp;|&nbsp; "
            '<span style="color:#dc3545;">{} failed</span>'
            "<br><br>"
            "<script>"
            "var batchId = {};"
            "var refreshInterval = setInterval(function() {{"
            '  fetch("{}" + batchId + "/progress/")'
            "    .then(r => r.json())"
            "    .then(data => {{"
            '      if (data.status === "completed" || data.status === "failed"'
            '          || data.status === "partial") {{'
            "        clearInterval(refreshInterval);"
            "        location.reload();"
            "      }}"
            "    }});"
            "}}, 5000);"
            "</script>",
            pct,
            pct,
            obj.completed_assets,
            obj.total_assets,
            obj.failed_assets,
            obj.pk,
            reverse("admin:core_datarefreshbatch_progress", args=[0]).rsplit("0", 1)[0],
        )

    progress_bar_detail.short_description = "Progress"


@admin.register(DataRefreshTask)
class DataRefreshTaskAdmin(admin.ModelAdmin):
    list_display = [
        "asset",
        "batch",
        "status",
        "candles_fetched",
        "timeframes_built",
        "started_at",
        "completed_at",
    ]
    list_filter = ["status", "batch"]
    search_fields = ["asset__symbol"]
    readonly_fields = [
        "batch",
        "asset",
        "celery_task_id",
        "status",
        "candles_fetched",
        "timeframes_built",
        "error_message",
        "started_at",
        "completed_at",
        "created_at",
    ]

    def has_add_permission(self, request):
        return False


# Register other models
admin.site.register(Tick)
admin.site.register(AlpacaAccount)
admin.site.register(Asset)
admin.site.register(Candle)  # Legacy, for migration period
