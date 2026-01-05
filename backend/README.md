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

## 📝 Code Quality
*   **Formatting**: Code is formatted using **Black**.
*   **Linting**: **Ruff** is used for linting.
*   **Pre-commit**: Ensure all checks pass before committing.
