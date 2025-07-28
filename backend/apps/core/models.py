from django.contrib.postgres.indexes import BrinIndex
from django.db import models

from apps.account.models import User

# Create your models here.


class BreezeAccount(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, blank=True, null=True)
    name = models.CharField(default="ADMIN", max_length=255)
    api_key = models.CharField(default=" ", max_length=255)
    api_secret = models.CharField(default=" ", max_length=255)
    session_token = models.CharField(max_length=255, null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.name


class Exchanges(models.Model):
    title = models.CharField(default="NSE", max_length=255)
    file = models.FileField(blank=False)
    code = models.CharField(default="1", max_length=255)
    exchange = models.CharField(default="NSE", max_length=255)
    is_option = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, blank=True, null=True)

    def __str__(self):
        return str(self.exchange)


class Instrument(models.Model):
    exchange = models.ForeignKey(Exchanges, on_delete=models.CASCADE)
    stock_token = models.CharField(blank=True, null=True, max_length=255)
    token = models.CharField(blank=True, null=True, max_length=255)
    instrument = models.CharField(null=True, blank=True, max_length=255)
    short_name = models.CharField(blank=True, null=True, max_length=255)
    series = models.CharField(blank=True, null=True, max_length=255)
    company_name = models.CharField(null=True, blank=True, max_length=255)
    expiry = models.DateField(blank=True, null=True)
    strike_price = models.FloatField(blank=True, null=True)
    option_type = models.CharField(blank=True, null=True, max_length=255)
    exchange_code = models.CharField(blank=True, null=True, max_length=255)

    def __str__(self):
        return (
            "Token:"
            + str(self.token)
            + " Instrument:"
            + str(self.instrument)
            + " Expiry:"
            + str(self.expiry)
            + " Strike Price"
            + str(self.strike_price)
            + "Short Name: "
            + str(self.short_name)
        )


class SubscribedInstruments(models.Model):
    exchange = models.ForeignKey(Exchanges, on_delete=models.CASCADE)
    stock_token = models.CharField(blank=True, null=True, max_length=255)
    token = models.CharField(blank=True, null=True, max_length=255)
    instrument = models.CharField(null=True, blank=True, max_length=255)
    short_name = models.CharField(blank=True, null=True, max_length=255)
    series = models.CharField(blank=True, null=True, max_length=255)
    company_name = models.CharField(null=True, blank=True, max_length=255)
    expiry = models.DateField(blank=True, null=True)
    strike_price = models.FloatField(blank=True, null=True)
    option_type = models.CharField(blank=True, null=True, max_length=255)
    exchange_code = models.CharField(blank=True, null=True, max_length=255)

    def __str__(self):
        return (
            "Token:"
            + str(self.token)
            + " Instrument:"
            + str(self.instrument)
            + " Expiry:"
            + str(self.expiry)
            + " Strike Price"
            + str(self.strike_price)
        )


class PercentageInstrument(models.Model):
    instrument = models.OneToOneField(
        SubscribedInstruments, related_name="percentage", on_delete=models.CASCADE
    )
    percentage = models.FloatField(default=0.0)
    is_loading = models.BooleanField(default=False)

    def __str__(self) -> str:
        return (
            "Instrument:"
            + str(self.instrument.short_name)
            + " Percentage:"
            + str(self.percentage)
            + " %"
            + "Is Finished:"
            + str("TRUE" if self.is_loading else "False")
        )


class Tick(models.Model):
    instrument = models.ForeignKey(
        SubscribedInstruments, on_delete=models.CASCADE, null=True, blank=True
    )
    ltp = models.FloatField(blank=True, null=True)
    ltq = models.FloatField(blank=True, null=True)
    date = models.DateTimeField(blank=True, null=True)
    used = models.BooleanField(default=False)

    def __str__(self) -> str:
        return (
            f"Name:{self.instrument.short_name}| LTP:{self.ltp} | TimeStamp:{self.date}"
        )


class Candle(models.Model):
    instrument = models.ForeignKey(
        SubscribedInstruments, on_delete=models.CASCADE, null=True, blank=True
    )
    open = models.FloatField(null=False)
    high = models.FloatField(null=False)
    low = models.FloatField(null=False)
    close = models.FloatField(null=False)
    volume = models.FloatField(null=True)
    date = models.DateTimeField(null=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            # Fast point/range look‑ups + ORDER BY on the B‑tree
            models.Index(
                fields=[
                    "instrument",
                    "-date",
                ],  # DESC so “latest first” scans are sequential
                name="idx_candle_instr_date_desc",
            ),
            # Optional: ultra‑cheap BRIN for big historical range scans
            BrinIndex(
                fields=["date"],
                name="brin_candle_date",
            ),
        ]
        ordering = [
            "date"
        ]  # ASC by default; your queryset can still .order_by('-date')

    def __str__(self):
        return (
            str(self.date)
            + " o:"
            + str(self.open)
            + " h:"
            + str(self.high)
            + " l:"
            + str(self.low)
            + " c:"
            + str(self.close)
        )


class Percentage(models.Model):
    source = models.CharField(blank=True, null=True, max_length=255)
    value = models.FloatField(blank=True, null=True)

    def __str__(self) -> str:
        return f"Source:{self.source}| Value:{self.value:.2f} %"
