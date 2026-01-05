# Backend Context (Django API)

## Overview
This is a **Django 5.2** project using **Django Rest Framework (DRF)** to serve as the API layer for the Alpaca Wrapper application. It handles user authentication, market data streaming, paper trading logic, and background tasks.

## Architecture

### Django Apps (`/apps`)
The project is modularized into distinct apps found in the `apps/` directory:
*   **`account`**: User authentication, profile management, and custom user models.
*   **`core`**: Core utilities, base models, shared helpers, and system-wide services.
*   **`home`**: likely for landing page or general app data.
*   **`paper_trading`**: The core logic for the paper trading simulation engine.

### Configuration (`/main/settings`)
Settings are split to ensure separation of concerns:
*   **`base.py`**: Common settings (apps, middleware, templates).
*   **`local.py`**: Local development overrides (debug mode, local DB).
*   **`production.py`**: Production security, S3 storage, logging.
*   **`test.py`**: Settings optimized for running tests (faster password hashers, in-memory DBs).

### Key Technologies
*   **Web Framework**: Django 5.2
*   **API**: Django Rest Framework 3.16 + SimpleJWT (Auth)
*   **Async/Real-time**: Django Channels (WebSockets)
*   **Task Queue**: Celery 5.5 + Redis (Broker & Backend)
*   **Database**: PostgreSQL (via `psycopg2-binary`)
*   **Package Manager**: `uv` is used for fast dependency resolution.

## Development Workflow

### Dependency Management
Dependencies are defined in `pyproject.toml`.
*   **Install/Sync**: The root `npm install` handles python deps via scripts, or use `uv pip sync requirements.txt`.

### Database Migrations
Always run migrations when modifying `models.py`.
*   **Create Migrations (Local):**
    ```bash
    npm run makemigrations:local
    ```
    *This runs `manage.py makemigrations` using your local python environment.*
*   **Apply Migrations (Docker):**
    ```bash
    npm run migrate
    ```
    *This runs `manage.py migrate` inside the running backend container.*

### Running Tests
Tests are located in `tests.py` within apps or `tests/` directories.
*   **Run All Tests:**
    ```bash
    npm run test
    ```
    *(Or `pytest` directly if in the virtual environment)*

## Code Style & Conventions
*   **Formatting**: The code is strictly formatted with **Black**.
*   **Linting**: **Ruff** is used to enforce quality standards.
*   **Imports**: Sorted by `isort` (configured via Ruff).
*   **Typing**: Type hints are encouraged for complex logic.

## Directory Map
```text
backend/
├── apps/               # Business logic modules
├── main/               # Project configuration
│   ├── asgi.py         # Entry point for WebSockets (Channels)
│   ├── wsgi.py         # Entry point for WSGI
│   └── settings/       # Split settings
├── scripts/            # Shell scripts for Docker entrypoints
├── Dockerfile.dev      # Dev container definition
└── pyproject.toml      # Project metadata and dependencies
```
