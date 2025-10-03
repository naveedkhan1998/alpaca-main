# Alpaca API Wrapper

> **🎉 This project uses NX for monorepo management!**
>
> **Quick Start:**
>
> ```bash
> npm install    # Install all dependencies
> npm run dev    # Start development (frontend + backend)
> ```

**Alpaca API Wrapper** is a Django-based starter project for building your own stock market analysis tools, backtesting engines, or trading bots. It leverages the Alpaca API for real-time market data and provides a full-stack, Dockerized environment.

Use it as a foundation for **backtesting, live-trading bots, research notebooks, or data pipelines**—with built-in support for watchlists, historical and real-time data, and a dedicated WebSocket service for streaming market data.

🌐 **Try the live demo:** [https://alpaca.mnaveedk.com/](https://alpaca.mnaveedk.com/)

---

## Table of Contents

- [Alpaca API Wrapper](#alpaca-api-wrapper)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Tech Stack](#tech-stack)
  - [Architecture](#architecture)
    - [Service Breakdown](#service-breakdown)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
    - [Quick Start (Recommended)](#quick-start-recommended)
    - [Individual Services](#individual-services)
    - [Access Points](#access-points)
  - [Development Workflow](#development-workflow)
    - [NX Monorepo Commands](#nx-monorepo-commands)
    - [Hot Reload](#hot-reload)
    - [Running Tests](#running-tests)
  - [Testing \& Monitoring](#testing--monitoring)
    - [Follow Celery logs](#follow-celery-logs)
    - [Multitail (optional)](#multitail-optional)
    - [Flower dashboard](#flower-dashboard)
  - [Contributing](#contributing)
    - [Development Guidelines](#development-guidelines)
    - [Issues](#issues)
  - [License](#license)
    - [MIT License Summary](#mit-license-summary)
  - [Acknowledgements](#acknowledgements)
    - [Core Technologies](#core-technologies)
    - [Infrastructure \& DevOps](#infrastructure--devops)
    - [Development Tools](#development-tools)
    - [Special Thanks](#special-thanks)
  - [Contact](#contact)
  - [to run with observibility](#to-run-with-observibility)

---

## Features

| Category                 | What you get                                                                 |
| ------------------------ | ---------------------------------------------------------------------------- |
| **Watchlists**           | Create watchlists, add assets, and manage your market focus                  |
| **Historical Data**      | Assets in watchlists fetch and cache historical OHLCV data automatically     |
| **Real-Time Data**       | Assets in watchlists are subscribed to real-time Alpaca market feeds         |
| **WebSocket Service**    | Dedicated Django management command runs in its own container, handling      |
|                          | real-time tick processing and candle aggregation (1m and higher timeframes)  |
| **Interactive Analysis** | Access and experiment with real-time and historical data for your watchlists |
| **Session management**   | Secure session generation with your API key & secret                         |
| **Task orchestration**   | Celery + Redis for async jobs & scheduling                                   |
| **Dockerised stack**     | `docker compose up` and you're done                                          |

---

## Tech Stack

| Layer                 | Tech                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------- |
| **Monorepo**          | NX · npm workspaces                                                                     |
| **Backend**           | Django · Django REST Framework                                                          |
| **Async / broker**    | Celery · Redis                                                                          |
| **Realtime**          | Django Channels (WebSockets)                                                            |
| **Frontend**          | React · Vite                                                                            |
| **Database**          | PostgreSQL                                                                              |
| **Container / infra** | Docker · Docker Compose                                                                 |
| **Dev tooling**       | `uv` (deps) · `black` (format) · `ruff` (lint) · `pytest` (tests) · `vitest` (FE tests) |

---

## Architecture

```
        ┌──────────────────────┐
        │   Users / Clients    │
        └─────────┬────────────┘
                  │ HTTP / WebSocket
                  │
            ┌─────▼─────────────┐
            │                   │
      ┌─────▼─────┐       ┌─────▼─────┐
      │ Frontend  │       │   Flower  │
      │  (5173)   │       │  (5555)   │
      │ React +   │       │ Dashboard │
      │  Vite     │       └───────────┘
      │ (Local)   │
      └───────────┘
            │
            │ API calls
            │
      ┌─────▼─────────────┬────────────────────────┐
      │                   │                        │
┌─────▼────────────┐ ┌────▼──────────────┐ ┌──────▼──────────┐
│ Django Backend   │ │ WebSocket Service │ │   NX Monorepo   │
│ API (ASGI)       │ │ (Django mgmt cmd, │ │  Orchestration  │
│ (Docker: 8000)   │ │  Docker container)│ │   (Local CLI)   │
└─────┬────────────┘ └───────────────────┘ └─────────────────┘
      │
      │
      │
      ┌───────────────┼───────────────┐
      │               │               │
┌─────▼───────┐ ┌─────▼───────┐ ┌─────▼───────┐
│ PostgreSQL  │ │   Redis     │ │   Celery    │
│   DB        │ │   Broker    │ │ Workers +   │
│ (Docker)    │ │  (Docker)   │ │   Beat      │
│             │ │             │ │  (Docker)   │
└─────────────┘ └─────────────┘ └─────────────┘
      ▲                             │
      │                             │
      └──────────── Task Queue ─────┘
```

### Service Breakdown

| Service            | Purpose                 | Port | Environment | Notes                                 |
| ------------------ | ----------------------- | ---- | ----------- | ------------------------------------- |
| **NX**             | Monorepo orchestration  | N/A  | Local       | Task runner, caching, parallelization |
| **Frontend**       | React SPA (Vite)        | 5173 | Local       | Hot module replacement enabled        |
| **Backend**        | Django API + WebSockets | 8000 | Docker      | ASGI server with Channels             |
| **PostgreSQL**     | Primary database        | 5432 | Docker      | Persistent data storage               |
| **Redis**          | Cache + Message broker  | 6379 | Docker      | Celery task queue                     |
| **Celery Workers** | Background tasks        | N/A  | Docker      | Async job processing                  |
| **Celery Beat**    | Task scheduler          | N/A  | Docker      | Periodic task execution               |
| **WebSocket**      | Real-time data stream   | 8001 | Docker      | Market data WebSocket service         |
| **Flower**         | Task monitoring         | 5555 | Docker      | Celery dashboard                      |

> **Infrastructure services** (backend, db, cache, broker, workers, beat, websocket, flower) are in **`docker-compose.yml`**.  
> **Frontend runs locally** via NX for fast hot reload. **NX orchestrates** all tasks across the monorepo.

---

## Prerequisites

- **Node.js** (v18 or higher) & **npm** installed
- **Docker** & **Docker Compose** installed
- **Python 3.13** (for backend development)
- An **ICICI Alpaca API** key & secret
- Create a `.env` file from `.env.local` with your API credentials

---

## Installation

```bash
git clone https://github.com/naveedkhan1998/alpaca-main.git
cd alpaca-main

# Option 1: Install everything (NX + Frontend + Backend)
npm run install:all

# Option 2: Install individually
npm install              # Install NX only
npm run install:frontend # Install frontend dependencies
npm run install:backend  # Install backend dependencies
```

**Installation Options:**

- **`npm run install:all`** - Installs NX, frontend dependencies (~768 packages), and backend dependencies (~72 Python packages)
- **`npm run install:frontend`** - Installs only frontend dependencies (useful for production frontend builds)
- **`npm run install:backend`** - Installs only backend dependencies (useful for backend-only deployments)
- **`npm install`** - Installs only NX for monorepo orchestration

> **Production Note:** In production environments, you can run `cd frontend && npm install` directly in the frontend directory without triggering the entire monorepo setup.

---

## Running the Application

### Quick Start (Recommended)

```bash
# Start all services (frontend + backend infrastructure)
npm run dev
```

This single command will:

- 🚀 Start the frontend Vite dev server (with hot reload)
- 🐳 Start Docker infrastructure (PostgreSQL, Redis, Backend API, Celery, WebSocket, Flower)
- ⚡ Run both in parallel automatically via NX

### Individual Services

```bash
# Frontend only (requires backend infrastructure running)
npm run dev:frontend

# Backend infrastructure only
npm run dev:backend

# Or manually start Docker services
npm run docker:up
```

### Access Points

Once everything is running, you can access:

- **Frontend Application**: [http://localhost:5173](http://localhost:5173) — React SPA with Vite HMR
- **Backend API**: [http://localhost:8000](http://localhost:8000) — Django REST API
- **Django Admin**: [http://localhost:8000/admin](http://localhost:8000/admin) — Admin interface
- **Celery Flower**: [http://localhost:5555](http://localhost:5555) — Task monitoring dashboard
- **WebSocket Service**: [ws://localhost:8001](ws://localhost:8001) — Real-time market data

> **Note:** Frontend runs locally with Vite for fast hot reload. Backend services run in Docker for consistency.

---

## Development Workflow

### NX Monorepo Commands

All commands run via NX for intelligent caching and parallel execution:

```bash
# Development
npm run dev              # Start both frontend + backend
npm run dev:frontend     # Frontend only
npm run dev:backend      # Backend only

# Code Quality
npm run lint             # Lint both projects
npm run lint:frontend    # Lint frontend only
npm run lint:backend     # Lint backend only
npm run format           # Format both projects
npm run format:frontend  # Format frontend only
npm run format:backend   # Format backend only

# Testing
npm run test             # Test both projects
npm run test:frontend    # Test frontend only
npm run test:backend     # Test backend only

# Docker Management
npm run docker:up        # Start Docker services
npm run docker:down      # Stop Docker services
npm run docker:logs      # View Docker logs
npm run docker:clean     # Clean Docker volumes
```

### Hot Reload

- **Frontend**: Vite dev server with instant HMR (Hot Module Replacement)
- **Backend**: Code mounted as Docker volume, auto-reloads on changes

### Running Tests

```bash
# All tests with NX caching
npm run test

# Frontend tests (Vitest)
npm run test:frontend

# Backend tests (pytest)
npm run test:backend
```

> **Tip:** NX caches test results. Only changed projects and their dependents will re-run tests!

---

## Testing & Monitoring

### Follow Celery logs

```bash
# all workers
docker compose exec backend tail -f /var/log/celery/w*.log
```

### Multitail (optional)

```bash
# install once on the host
sudo apt-get install multitail  # or yum install multitail

# split‑screen log view
docker compose exec backend multitail /var/log/celery/w1.log /var/log/celery/w2.log
```

### Flower dashboard

Open **[http://localhost:5555](http://localhost:5555)** in your browser for task‑level visibility.

> **Tip:** Configure log‑rotation (`logrotate`) inside the container—or mount `/var/log/celery` to your host—to keep log sizes under control.

---

## Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and ensure tests pass
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to the branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style (we use `black` for Python and `prettier` for JavaScript)
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

### Issues

Found a bug or have a feature request? Please [open an issue](https://github.com/naveedkhan1998/alpaca-main/issues) with:

- Clear description of the problem or feature
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Your environment details

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### MIT License Summary

- ✅ **Use** - Use the software for any purpose
- ✅ **Modify** - Change the software to suit your needs
- ✅ **Distribute** - Share the software with others
- ✅ **Commercial use** - Use the software for commercial purposes
- ❗ **Include license** - Include the original license when distributing

---

## Acknowledgements

This project wouldn't be possible without these amazing technologies and resources:

### Core Technologies

- [Alpaca API](https://alpaca.markets/) - The financial data API that powers this wrapper
- [NX](https://nx.dev/) - Smart monorepo build system with intelligent caching and task orchestration
- [Django](https://www.djangoproject.com/) & [Django REST Framework](https://www.django-rest-framework.org/) - Web framework and API toolkit
- [Django Channels](https://channels.readthedocs.io/) - WebSocket support for Django
- [Celery](https://docs.celeryproject.org/) - Distributed task queue
- [Redis](https://redis.io/) - In-memory data structure store
- [PostgreSQL](https://www.postgresql.org/) - Powerful, open source object-relational database
- [React](https://reactjs.org/) & [Vite](https://vitejs.dev/) - Frontend framework and build tool

### Infrastructure & DevOps

- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/) - Containerization platform
- [npm workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces) - Monorepo package management
- [uv](https://github.com/astral-sh/uv) - Fast Python package installer

### Development Tools

- [Black](https://black.readthedocs.io/) - Python code formatter
- [Ruff](https://github.com/astral-sh/ruff) - Fast Python linter
- [pytest](https://docs.pytest.org/) - Python testing framework
- [Vitest](https://vitest.dev/) - Vite-native testing framework

### Special Thanks

- The open source community for creating and maintaining these incredible tools
- All contributors who have helped improve this project

> **Disclaimer:** This project is not affiliated with Alpaca Markets. Use at your own risk and ensure compliance with Alpaca's terms of service.

---

## Contact

**Naveed Khan**  
📧 **Email:** [naveedkhan13041998@gmail.com](mailto:naveedkhan13041998@gmail.com)  
🐙 **GitHub:** [naveedkhan1998](https://github.com/naveedkhan1998)  
🌐 **Website:** [mnaveedk.com](https://mnaveedk.com)

---

## to run with observibility

docker compose -f docker-compose.yaml -f docker-compose.local.yaml up -d

_Happy hacking & good trades! 🚀_
