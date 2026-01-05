# Alpaca API Wrapper Project Context

## Project Overview
This project is a comprehensive **Alpaca API Wrapper** designed for stock market analysis, backtesting, and algorithmic trading. It is structured as a **monorepo** managed by **NX**, featuring a Django-based backend and a React-based frontend.

The system is fully Dockerized and includes real-time capabilities via WebSockets, asynchronous task processing with Celery, and a modern UI for data visualization.

## Architecture

### Backend (`/backend`)
*   **Framework:** Django 5.2 + Django REST Framework 3.16
*   **Real-time:** Django Channels (WebSockets) using Redis
*   **Async Tasks:** Celery + Celery Beat (Scheduler)
*   **Database:** PostgreSQL
*   **Cache/Broker:** Redis
*   **Package Manager:** `uv` (inferred from `pyproject.toml` structure/speed) or standard pip.

### Frontend (`/frontend`)
*   **Framework:** React 19 + Vite 7
*   **Language:** TypeScript
*   **UI Library:** Tailwind CSS, Radix UI (headless components), Shadcn/UI patterns.
*   **State Management:** Redux Toolkit
*   **Data Visualization:** Lightweight Charts, Chart.js
*   **Testing:** Vitest

### Infrastructure
*   **Orchestration:** Docker Compose
*   **Monorepo Tool:** NX (handles caching, task running)

## Getting Started

### Prerequisites
*   **Node.js** (v18+) & **npm**
*   **Docker** & **Docker Compose**
*   **Alpaca API Credentials** (Key & Secret)

### Installation
1.  Clone the repository.
2.  Create `.envs/.env` with your Alpaca credentials (see `.envs` folder).
3.  Run setup:
    ```bash
    npm install
    ```

### Running the Application
*   **Full Stack (Recommended):**
    ```bash
    npm run dev
    ```
    This starts the Frontend (Vite) and Backend infrastructure (Docker) in parallel.

*   **Individual Services:**
    *   Frontend only: `npm run dev:frontend`
    *   Backend only: `npm run dev:backend`
    *   Docker Infra only: `npm run docker:up`

## Key Commands

| Action | Command | Description |
| :--- | :--- | :--- |
| **Start Dev** | `npm run dev` | Starts Frontend + Backend Infra |
| **Stop Docker** | `npm run docker:down` | Stops all Docker containers |
| **Linting** | `npm run lint` | Lints both Backend (Ruff) and Frontend (ESLint) |
| **Formatting** | `npm run format` | Formats code (Black/Prettier) |
| **Testing** | `npm run test` | Runs Pytest and Vitest |
| **Migrations** | `npm run makemigrations:local` | Creates Django migrations locally |
| **Apply Migrations** | `npm run migrate` | Applies migrations inside Docker |
| **Build Frontend** | `npm run build` | Builds React app for production |

## Directory Structure

*   **`backend/`**: Django project root.
    *   `apps/`: Django apps (`account`, `core`, `home`, `paper_trading`).
    *   `main/`: Project settings and configuration.
    *   `scripts/`: Shell scripts for container entrypoints.
*   **`frontend/`**: React application.
    *   `src/features/`: Feature-based folder structure.
    *   `src/shared/`: Shared components and utilities.
*   **`charts/`**: Helm charts for Kubernetes deployment.
*   **`.envs/`**: Environment variable files (ensure `.env` exists here).
*   **`docker-compose.yaml`**: Main infrastructure definition.

## Development Workflow

1.  **Code Style:**
    *   **Python:** Strictly adheres to **Black** formatting and **Ruff** linting rules.
    *   **TypeScript:** Uses **Prettier** and **ESLint**.
    *   Always run `npm run lint` and `npm run format` before committing.

2.  **Database Changes:**
    *   Modify Django models.
    *   Run `npm run makemigrations:local` to generate migration files.
    *   Run `npm run migrate` to apply them to the running Docker container.

3.  **Testing:**
    *   Write tests in `tests.py` or `tests/` directories for Django.
    *   Write `*.test.tsx` for React components.
    *   Run `npm run test` to verify changes.

## Tech Stack Details

*   **Python:** 3.13+
*   **Django:** 5.2.x
*   **React:** 19.x
*   **Vite:** 7.x
*   **Tailwind:** 3.4.x
*   **Celery:** 5.5.x
