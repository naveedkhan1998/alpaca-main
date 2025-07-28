# Gemini Code Understanding

This document provides a high-level overview of the Django project, its structure, and key components.

## Project Overview

This project is a Django-based backend application that serves as a wrapper for the ICICI Breeze API, providing functionalities for managing user accounts, handling financial instrument data, and interacting with the Breeze API for real-time trading data.

The project is structured into several Django apps, each responsible for a specific set of features. It uses Django REST Framework for building RESTful APIs, Celery for asynchronous task processing, and Redis for caching and as a message broker.

### Core Technologies

- **Backend Framework:** Django
- **API:** Django REST Framework
- **Asynchronous Tasks:** Celery
- **Database:** PostgreSQL
- **Caching & Message Broker:** Redis
- **Real-time Communication:** Django Channels (with Daphne)
- **Authentication:** Simple JWT for token-based authentication

## Project Structure

The project follows a standard Django project layout with a few customizations.

- **`main/`**: The main Django project directory.
  - **`settings/`**: Contains the different settings files for the project (`base.py`, `local.py`, `production.py`).
  - **`urls.py`**: The root URL configuration for the project.
  - **`asgi.py` & `wsgi.py`**: Entry points for ASGI and WSGI compatible web servers.
  - **`celery.py`**: Celery application instance.
- **`apps/`**: This directory contains the individual Django applications.
  - **`account/`**: Manages user authentication, registration, profile management, and password reset functionalities.
  - **`core/`**: The core application of the project. It handles interactions with the Breeze API, manages financial instruments, subscriptions, and candle data.
  - **`home/`**: A basic application, likely for a landing page or general-purpose views.
- **`scripts/`**: Contains shell scripts for running various components of the project, such as the backend server, Celery workers, and Celery Beat.
- **`pyproject.toml`**: Defines project metadata and dependencies.
- **`requirements.txt`**: Lists the Python dependencies for the project.
- **`Dockerfile.dev`**: Docker configuration for setting up a development environment.

### Important Note on Project Naming

The main Django project directory is named `main` instead of the conventional `config`. This is due to a dependency conflict with `breeze-connect`, which internally references a `config` module.

## Key Functionalities

### User Management (`apps/account`)

- **User Registration:** `UserRegistrationView`
- **User Login:** `UserLoginView`
- **User Profile:** `UserProfileView`
- **Password Management:** `UserChangePassword`, `SendPasswordResetEmailView`, `UserPasswordResetView`

### Core Trading Functionalities (`apps/core`)

- **Breeze Account Management:** `BreezeAccountViewSet` allows users to manage their Breeze API credentials.
- **Breeze API Interaction:** The `breeze` module within the `core` app likely contains the logic for interacting with the Breeze API.
- **Instrument Management:** `InstrumentViewSet` provides an endpoint to search for financial instruments.
- **Subscriptions:** `SubscribedInstrumentsViewSet` allows users to subscribe to instruments for real-time data.
- **Candle Data:** `CandleViewSet` provides historical candle data for subscribed instruments and supports resampling to different timeframes.
- **WebSocket Communication:** The application uses WebSockets (likely through Django Channels) to stream real-time data. The `websocket_start` task initiates the WebSocket connection.

### Asynchronous Tasks

The project uses Celery to handle long-running tasks in the background. Key tasks include:

- **`load_instrument_candles`**: Fetches historical candle data for an instrument.
- **`resample_candles`**: Resamples candle data to a different timeframe.
- **`websocket_start`**: Starts the WebSocket connection for real-time data.

## Getting Started

To run the project, you would typically need to:

1.  Install the dependencies from `requirements.txt`.
2.  Set up the necessary environment variables (e.g., database credentials, secret key).
3.  Run the Django development server.
4.  Start the Celery worker and Celery Beat for asynchronous tasks.

The provided shell scripts in the `scripts/` directory can be used to automate these processes.

## Testing

Pytest has been setup, we can run tests by running uv run pytest
