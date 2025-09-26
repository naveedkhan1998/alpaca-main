from decimal import Decimal, InvalidOperation

from django.utils import timezone
from rest_framework import serializers

from .models import PaperTrade


class PaperTradeSerializer(serializers.ModelSerializer):
    asset_symbol = serializers.CharField(source="asset.symbol", read_only=True)
    asset_name = serializers.CharField(source="asset.name", read_only=True)
    entry_cost = serializers.DecimalField(
        max_digits=20,
        decimal_places=6,
        read_only=True,

    )
    realized_pl = serializers.DecimalField(
        max_digits=20,
        decimal_places=6,
        read_only=True,
     
    )
    unrealized_pl = serializers.SerializerMethodField()
    current_value = serializers.SerializerMethodField()

    class Meta:
        model = PaperTrade
        fields = [
            "id",
            "asset",
            "asset_symbol",
            "asset_name",
            "direction",
            "quantity",
            "entry_price",
            "entry_at",
            "target_price",
            "stop_loss",
            "take_profit",
            "status",
            "exit_price",
            "exit_at",
            "notes",
            "entry_cost",
            "realized_pl",
            "unrealized_pl",
            "current_value",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "status",
            "exit_price",
            "exit_at",
            "realized_pl",
            "unrealized_pl",
            "current_value",
            "entry_cost",
            "created_at",
            "updated_at",
        ]

    def _get_current_price(self) -> Decimal | None:
        value = None
        request = self.context.get("request")
        if request:
            value = request.query_params.get("current_price")
        if value is None:
            value = self.context.get("current_price")
        if value in (None, ""):
            return None
        try:
            return Decimal(str(value))
        except (InvalidOperation, TypeError):
            return None

    def get_unrealized_pl(self, obj: PaperTrade):
        current_price = self._get_current_price()
        if current_price is None:
            return None
        return obj.compute_unrealized_pl(current_price)

    def get_current_value(self, obj: PaperTrade):
        current_price = self._get_current_price()
        if current_price is None:
            return None
        return current_price * obj.quantity

    def validate_quantity(self, value: Decimal):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value

    def validate_entry_price(self, value: Decimal):
        if value <= 0:
            raise serializers.ValidationError("Entry price must be greater than zero.")
        return value

    def validate(self, attrs):
        target_price = attrs.get("target_price")
        stop_loss = attrs.get("stop_loss")
        take_profit = attrs.get("take_profit")
        for field in (target_price, stop_loss, take_profit):
            if field is not None and field <= 0:
                raise serializers.ValidationError(
                    "Targets and stops must be greater than zero when provided."
                )
        return super().validate(attrs)

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["user"] = request.user
        else:
            raise serializers.ValidationError("Authenticated user is required.")
        return super().create(validated_data)


class PaperTradeCloseSerializer(serializers.Serializer):
    exit_price = serializers.DecimalField(max_digits=18, decimal_places=6)
    exit_at = serializers.DateTimeField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_exit_price(self, value: Decimal):
        if value <= 0:
            raise serializers.ValidationError("Exit price must be greater than zero.")
        return value

    def update(self, instance: PaperTrade, validated_data):
        exit_price: Decimal = validated_data["exit_price"]
        exit_at = validated_data.get("exit_at") or timezone.now()
        instance.exit_price = exit_price
        instance.exit_at = exit_at
        instance.status = PaperTrade.Status.CLOSED
        if notes := validated_data.get("notes"):
            instance.notes = notes
        instance.save(
            update_fields=["exit_price", "exit_at", "status", "notes", "updated_at"]
        )
        return instance

    def create(self, validated_data):
        raise NotImplementedError
