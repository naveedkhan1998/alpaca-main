from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.account.models import User
from apps.core.models import Asset
from apps.paper_trading.models import PaperTrade


class PaperTradeApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="paper@example.com", name="Paper Trader", password="pass1234"
        )
        self.asset = Asset.objects.create(
            alpaca_id="asset-001",
            symbol="PAPER",
            name="Paper Corp",
        )
        self.client.force_authenticate(self.user)

    def test_create_trade(self):
        url = reverse("paper-trades-list")
        payload = {
            "asset": self.asset.pk,
            "direction": PaperTrade.Direction.LONG,
            "quantity": "2",
            "entry_price": "123.45",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PaperTrade.objects.count(), 1)
        trade = PaperTrade.objects.get()
        self.assertEqual(trade.asset, self.asset)
        self.assertEqual(trade.direction, PaperTrade.Direction.LONG)

    def test_close_trade(self):
        trade = PaperTrade.objects.create(
            user=self.user,
            asset=self.asset,
            direction=PaperTrade.Direction.LONG,
            quantity=Decimal("1"),
            entry_price=Decimal("100"),
        )
        url = reverse("paper-trades-close", args=[trade.pk])
        response = self.client.post(url, {"exit_price": "110"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        trade.refresh_from_db()
        self.assertEqual(trade.status, PaperTrade.Status.CLOSED)
        self.assertEqual(trade.exit_price, Decimal("110"))

    def test_cancel_trade(self):
        trade = PaperTrade.objects.create(
            user=self.user,
            asset=self.asset,
            direction=PaperTrade.Direction.LONG,
            quantity=Decimal("1"),
            entry_price=Decimal("70"),
        )
        url = reverse("paper-trades-cancel", args=[trade.pk])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        trade.refresh_from_db()
        self.assertEqual(trade.status, PaperTrade.Status.CANCELLED)

    def test_filter_trades_by_asset(self):
        other_asset = Asset.objects.create(
            alpaca_id="asset-002",
            symbol="ALT",
            name="Alt Asset",
        )
        PaperTrade.objects.create(
            user=self.user,
            asset=self.asset,
            direction=PaperTrade.Direction.LONG,
            quantity=Decimal("1"),
            entry_price=Decimal("100"),
        )
        PaperTrade.objects.create(
            user=self.user,
            asset=other_asset,
            direction=PaperTrade.Direction.LONG,
            quantity=Decimal("1"),
            entry_price=Decimal("50"),
        )
        url = reverse("paper-trades-list")
        response = self.client.get(url, {"asset": self.asset.pk})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["asset"], self.asset.pk)
