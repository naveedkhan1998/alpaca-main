"""
Data refresh task tracking models.

Tracks progress of admin-triggered data refresh tasks (1-min candle
fetching and timeframe aggregation) dispatched to Celery workers.
"""

from django.db import models
from django.utils import timezone


class DataRefreshBatch(models.Model):
    """
    A batch of data refresh tasks triggered from the admin panel.

    Groups individual per-asset tasks so the admin can monitor an
    entire refresh operation at a glance.
    """

    REFRESH_TYPE_CHOICES = [
        ("minute", "1-Minute Candles"),
        ("timeframe", "Timeframe Aggregation"),
        ("full", "Full Refresh (1-Min + Timeframes)"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("running", "Running"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("partial", "Partially Completed"),
    ]

    refresh_type = models.CharField(
        max_length=20,
        choices=REFRESH_TYPE_CHOICES,
        help_text="Type of data refresh operation",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
    )
    total_assets = models.IntegerField(default=0)
    completed_assets = models.IntegerField(default=0)
    failed_assets = models.IntegerField(default=0)
    data_window_days = models.IntegerField(
        help_text="Rolling window in days from current date",
    )
    triggered_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Data Refresh Batch"
        verbose_name_plural = "Data Refresh Batches"

    def __str__(self):
        return (
            f"[{self.get_refresh_type_display()}] "
            f"{self.completed_assets}/{self.total_assets} — {self.status}"
        )

    @property
    def progress_pct(self):
        if self.total_assets == 0:
            return 0
        return int(
            (self.completed_assets + self.failed_assets) / self.total_assets * 100
        )

    def update_status(self):
        """Recompute batch status from child tasks."""
        tasks = self.tasks.all()
        self.completed_assets = tasks.filter(status="completed").count()
        self.failed_assets = tasks.filter(status="failed").count()
        finished = self.completed_assets + self.failed_assets

        if finished >= self.total_assets:
            if self.failed_assets == 0:
                self.status = "completed"
            elif self.completed_assets == 0:
                self.status = "failed"
            else:
                self.status = "partial"
            self.completed_at = timezone.now()
        else:
            self.status = "running"
        self.save()


class DataRefreshTask(models.Model):
    """
    Per-asset task within a data refresh batch.

    Maps 1-to-1 with a Celery task so the admin panel can display
    real-time progress for each asset.
    """

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("running", "Running"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    batch = models.ForeignKey(
        DataRefreshBatch,
        on_delete=models.CASCADE,
        related_name="tasks",
    )
    asset = models.ForeignKey(
        "core.Asset",
        on_delete=models.CASCADE,
    )
    celery_task_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
    )
    candles_fetched = models.IntegerField(default=0)
    timeframes_built = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, default="")
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "Data Refresh Task"
        verbose_name_plural = "Data Refresh Tasks"

    def __str__(self):
        return f"{self.asset.symbol} — {self.status}"

    def mark_running(self):
        self.status = "running"
        self.started_at = timezone.now()
        self.save(update_fields=["status", "started_at"])

    def mark_completed(self, candles_fetched=0, timeframes_built=0):
        self.status = "completed"
        self.candles_fetched = candles_fetched
        self.timeframes_built = timeframes_built
        self.completed_at = timezone.now()
        self.save(
            update_fields=[
                "status",
                "candles_fetched",
                "timeframes_built",
                "completed_at",
            ]
        )
        self.batch.update_status()

    def mark_failed(self, error_message=""):
        self.status = "failed"
        self.error_message = error_message
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "error_message", "completed_at"])
        self.batch.update_status()
