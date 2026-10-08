# Alpaca Wrapper - Backend API

## 🐍 Project Overview
This is the Django-based backend for the Alpaca API Wrapper. It provides a robust REST API for user management, stock market data processing, and paper trading simulations. It leverages **Celery** for asynchronous tasks and **Django Channels** for real-time WebSocket communication.

## 🛠 Tech Stack
*   **Framework:** Django 5.2
*   **API:** Django REST Framework (DRF) 3.16
*   **Database:** PostgreSQL
*   **Async/Real-time:** Celery 5.5, Redis, Django Channels
*   **Authentication:** JWT (SimpleJWT)
*   **Package Management:** `uv` / `pip`

## 🚀 Getting Started

### Prerequisites
*   Python 3.13+
*   PostgreSQL
*   Redis (for Celery/Channels)

### Installation
Dependencies are managed via `pyproject.toml`.
```bash
# Install dependencies
pip install -r requirements.txt
# OR if using uv
uv pip install -r requirements.txt
```

### Running Locally
While the main project uses Docker, you can run the backend locally for debugging:

1.  **Set Environment Variables**: Ensure `.envs/.env` is correctly populated.
2.  **Apply Migrations**:
    ```bash
    python manage.py migrate
    ```
3.  **Start Server**:
    ```bash
    python manage.py runserver 0.0.0.0:8000
    ```

## 📂 Project Structure
*   **`apps/`**: Contains modular Django applications (`account`, `core`, `paper_trading`, etc.).
*   **`main/`**: Project configuration (settings, `wsgi.py`, `asgi.py`).
*   **`scripts/`**: Utility scripts and Docker entrypoints.

## 🧪 Testing
Run the comprehensive test suite using Pytest:
```bash
pytest
```

## Market data handling

Stock history and WebSocket initialization automatically check real-time SIP
access first, then fall back to IEX if Alpaca explicitly denies SIP entitlement.
The selected feed is reused per credentials and data endpoint for the lifetime
of each process; restart services after changing your subscription. No feed
environment variable is needed. Authentication errors, network failures, and
server errors do not silently downgrade the feed.
Crypto and option history use their own endpoints. Historical loading follows
every pagination token, preserves fractional volumes, and replaces provisional
candles with provider snapshots. Transient GET failures retry with bounded
backoff; permanent errors and exhausted retries fail explicitly.

Live trade candles are provisional: they contain the trades observed by this
process, use participant-timestamp ordering and field-level condition filtering,
and deduplicate prints with trade IDs. A connection starting midway through a
minute may initially show a partial candle. Alpaca minute bars and updated bars
replace that candle, including corrected prices and volume; later trade ticks
cannot overwrite an authoritative minute. Trade corrections/cancels are
reconciled through the provider's updated-bar channel.

Higher timeframes are rebuilt from stored minute candles, not summed from
repeated live snapshots. Historical and live aggregation share UTC-aligned
buckets. Existing higher-timeframe data created with the old market-open anchor
should be rebuilt using the admin data refresh: select **Full** refresh so minute
history is refreshed and all higher-timeframe candles in the rolling window are
replaced. Equities retain regular-hours filtering; crypto data remains 24/7.
Queued/running backfills defer live writes and retain a bounded five-minute
buffer of authoritative bars for replay.

PostgreSQL repository regressions can additionally run against an isolated test
database by setting `MARKET_DATA_TEST_POSTGRES_DSN` and running
`pytest apps/core/tests/test_candle_repository.py`. These tests use temporary
tables and roll back their changes.

## 📝 Code Quality
*   **Formatting**: Code is formatted using **Black**.
*   **Linting**: **Ruff** is used for linting.
*   **Pre-commit**: Ensure all checks pass before committing.
