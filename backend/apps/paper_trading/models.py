from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone


class PaperTrade(models.Model):
    """Represents a simulated position opened and closed by the user."""

    class Direction(models.TextChoices):
        LONG = "LONG", "Long"
        SHORT = "SHORT", "Short"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        CLOSED = "CLOSED", "Closed"
        CANCELLED = "CANCELLED", "Cancelled"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="paper_trades",
    )
    asset = models.ForeignKey(
        "core.Asset",
        on_delete=models.CASCADE,
        related_name="paper_trades",
    )
    direction = models.CharField(
        max_length=5,
        choices=Direction.choices,
        default=Direction.LONG,
    )
    quantity = models.DecimalField(max_digits=18, decimal_places=6)
    entry_price = models.DecimalField(max_digits=18, decimal_places=6)
    entry_at = models.DateTimeField(default=timezone.now)
    target_price = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="Optional price target you want to hit for the trade.",
    )
    stop_loss = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="Optional stop loss boundary to track against.",
    )
    take_profit = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="Optional take profit boundary to track against.",
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.OPEN,
    )
    exit_price = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        null=True,
        blank=True,
    )
    exit_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["user", "asset", "status"],
                name="pt_user_asset_status_idx",
            ),
            models.Index(
                fields=["asset", "entry_at"],
                name="pt_asset_entry_idx",
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.user_id}:{self.asset.symbol} {self.direction} "
            f"{self.quantity}@{self.entry_price}"
        )

    @property
    def entry_cost(self) -> Decimal:
        return (self.entry_price or Decimal("0")) * (self.quantity or Decimal("0"))

    @property
    def is_open(self) -> bool:
        return self.status == self.Status.OPEN

    @property
    def realized_pl(self) -> Decimal | None:
        if self.exit_price is None:
            return None
        return self._compute_pl(self.exit_price)

    def _compute_pl(self, price: Decimal) -> Decimal:
        multiplier = (
            Decimal("1") if self.direction == self.Direction.LONG else Decimal("-1")
        )
        return (price - self.entry_price) * self.quantity * multiplier

    def compute_unrealized_pl(self, current_price: Decimal | None) -> Decimal | None:
        if current_price is None:
            return None
        return self._compute_pl(current_price)

    def mark_closed(self, *, exit_price: Decimal, exit_at=None) -> None:
        if not self.is_open:
            raise ValueError("Trade is not open and cannot be closed.")
        self.exit_price = exit_price
        self.exit_at = exit_at or timezone.now()
        self.status = self.Status.CLOSED
        self.save(update_fields=["exit_price", "exit_at", "status", "updated_at"])

    def cancel(self) -> None:
        if not self.is_open:
            raise ValueError("Only open trades can be cancelled.")
        self.status = self.Status.CANCELLED
        self.exit_at = timezone.now()
        self.save(update_fields=["status", "exit_at", "updated_at"])
