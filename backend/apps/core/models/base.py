"""
Base models for sync status and Alpaca account configuration.
"""

from django.db import models

from apps.account.models import User


class SyncStatus(models.Model):
    """
    Global sync status for asset synchronization.
    
    Tracks the last synchronization time, total items synced, and whether
    a sync operation is currently in progress.
    
    Attributes:
        sync_type: Type of sync operation (currently only 'assets' is supported).
        last_sync_at: Timestamp of the last successful sync.
        total_items: Total number of items synced in the last operation.
        is_syncing: Flag indicating if a sync is currently in progress.
        created_at: When this record was created.
        updated_at: When this record was last updated.
    """

    SYNC_TYPE_CHOICES = [
        ("assets", "Assets"),
    ]

    sync_type = models.CharField(
        max_length=20,
        choices=SYNC_TYPE_CHOICES,
        default="assets",
        unique=True,
        help_text="Type of sync operation",
    )
    last_sync_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Timestamp of last successful sync",
    )
    total_items = models.IntegerField(
        default=0,
        help_text="Total items synced in last operation",
    )
    is_syncing = models.BooleanField(
        default=False,
        help_text="Whether a sync is currently in progress",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Sync Status"
        verbose_name_plural = "Sync Statuses"

    def __str__(self) -> str:
        return f"{self.sync_type} sync - Last: {self.last_sync_at}"


class AlpacaAccount(models.Model):
    """
    Alpaca API account credentials for a user.
    
    Stores the API key and secret for authenticating with Alpaca's trading API.
    Each user can have multiple accounts (e.g., paper vs live trading).
    
    Attributes:
        user: The user who owns this account (optional for admin accounts).
        name: Display name for the account.
        api_key: Alpaca API key.
        api_secret: Alpaca API secret (sensitive, should be encrypted at rest).
        last_updated: When credentials were last modified.
        last_sync_at: When data was last synced for this account.
        is_active: Whether this account is currently active.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        help_text="User who owns this account",
    )
    name = models.CharField(
        default="ADMIN",
        max_length=255,
        help_text="Display name for this account",
    )
    api_key = models.CharField(
        default=" ",
        max_length=255,
        help_text="Alpaca API key",
    )
    api_secret = models.CharField(
        default=" ",
        max_length=255,
        help_text="Alpaca API secret",
    )
    last_updated = models.DateTimeField(auto_now=True)
    last_sync_at = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Alpaca Account"
        verbose_name_plural = "Alpaca Accounts"

    def __str__(self) -> str:
        return self.name
