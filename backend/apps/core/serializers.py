# core/serializers.py

from rest_framework import serializers

from apps.core.models import (
    BreezeAccount,
    Candle,
    Instrument,
    PercentageInstrument,
    SubscribedInstruments,
)


class PercentageInstrumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PercentageInstrument
        fields = ["percentage", "is_loading"]


class AllInstrumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Instrument
        fields = "__all__"


class SubscribedSerializer(serializers.ModelSerializer):
    percentage = PercentageInstrumentSerializer(read_only=True)

    class Meta:
        model = SubscribedInstruments
        fields = "__all__"


class InstrumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Instrument
        fields = "__all__"

    def to_representation(self, instance):
        if isinstance(instance, SubscribedInstruments):
            serializer = SubscribedSerializer(instance=instance)
        else:
            serializer = AllInstrumentSerializer(instance=instance)
        return serializer.data


class CandleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Candle
        fields = ["open", "high", "low", "close", "volume", "date"]


class BreezeAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BreezeAccount
        fields = "__all__"


class AggregatedCandleSerializer(serializers.Serializer):
    date = serializers.DateTimeField(source="bucket")
    open = serializers.FloatField(source="o")
    high = serializers.FloatField(source="h_")
    low = serializers.FloatField(source="l_")
    close = serializers.FloatField(source="c")
    volume = serializers.FloatField(source="v_")
