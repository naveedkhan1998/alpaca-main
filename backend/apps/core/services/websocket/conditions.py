"""Field-level trade eligibility shared by realtime candle construction."""

OHLC_INELIGIBLE_CONDITIONS = frozenset(
    {
        "4",
        "7",
        "9",
        "B",
        "C",
        "G",
        "H",
        "I",
        "M",
        "N",
        "P",
        "Q",
        "R",
        "T",
        "U",
        "V",
        "W",
        "Z",
    }
)
VOLUME_INELIGIBLE_CONDITIONS = frozenset({"B", "W", "9", "M", "Q"})


def is_ohlc_eligible(conditions: list[str] | None) -> bool:
    return not OHLC_INELIGIBLE_CONDITIONS.intersection(conditions or ())


def is_volume_eligible(conditions: list[str] | None) -> bool:
    return not VOLUME_INELIGIBLE_CONDITIONS.intersection(conditions or ())
