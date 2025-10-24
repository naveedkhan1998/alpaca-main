# Alpaca API Wrapper

> **🎉 This project uses NX for monorepo management!**
>
> **Quick Start:**
>
> ```bash
> npm install    # Install all dependencies with prerequisite checks
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
    - [Database Development](#database-development)
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
| **Dev tooling**       | `uv` (deps) · `black` (format) · `ruff` (lint) · `pytest` (tests) · `vitest` (FE tests) · **Smart setup scripts** |

---

## Architecture

![Architecture Diagram](docs/architecture_diagram.svg)

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
| **WebSocket**      | Real-time data stream   | N/A  | Docker      | Market data WebSocket service         |
| **Flower**         | Task monitoring         | 5555 | Docker      | Celery dashboard                      |

> **Infrastructure services** (backend, db, cache, broker, workers, beat, websocket, flower) are in **`docker-compose.yml`**.  
> **Frontend runs locally** via NX for fast hot reload. **NX orchestrates** all tasks across the monorepo with **smart prerequisite checking**.

---

## Prerequisites

- **Node.js** (v18 or higher) & **npm** installed
- **Docker** & **Docker Compose** installed
- **uv** (Python package installer) installed
- An **Alpaca API** key & secret
- Create a `.envs/.env` file with your API credentials

> **Note:** The setup will automatically check for all prerequisites and guide you through any missing requirements.

---

## Installation

```bash
git clone https://github.com/naveedkhan1998/alpaca-main.git
cd alpaca-main

# Install everything automatically (NX + Frontend + Backend)
npm install
```

**What happens during installation:**

- ✅ Checks for Node.js, Docker, and uv installation
- ✅ Validates Alpaca API credentials in `.envs/.env`
- ✅ Installs NX monorepo tooling
- ✅ Installs frontend dependencies (~768 packages)
- ✅ Installs and syncs backend dependencies (~72 Python packages)
- ✅ Creates setup completion marker

> **Note:** If any prerequisites are missing, the installation will stop and provide clear instructions on what to install.

---

## Running the Application

### Quick Start (Recommended)

```bash
# Install everything automatically
npm install

# Start all services (frontend + backend infrastructure)
npm run dev
```

This single command will:

- 🚀 Start the frontend Vite dev server (with hot reload)
- 🐳 Start Docker infrastructure (PostgreSQL, Redis, Backend API, Celery, WebSocket, Flower)
- ⚡ Run both in parallel automatically via NX

> **Note:** `npm install` includes prerequisite checks and will guide you if anything is missing.

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
npm run lint:fix         # Lint and auto-fix both projects
npm run format           # Format both projects
npm run format:check     # Check formatting without changes

# Testing
npm run test             # Test both projects
npm run test:coverage    # Test both with coverage reports

# Database Management
npm run makemigrations       # Make migrations in Docker container
npm run makemigrations:local # Make migrations locally (faster for development)
npm run migrate              # Apply migrations in Docker container

# Docker Management
npm run docker:up        # Start Docker services
npm run docker:down      # Stop Docker services
npm run docker:logs      # View Docker logs
npm run docker:clean     # Clean Docker volumes
npm run backend:shell    # Shell into backend Docker container

# Build
npm run build            # Build frontend for production
```

### Hot Reload

- **Frontend**: Vite dev server with instant HMR (Hot Module Replacement)
- **Backend**: Code mounted as Docker volume, auto-reloads on changes

### Database Development

For faster development iterations, use local migration commands:

```bash
# Make migrations locally (faster than Docker)
npm run makemigrations:local

# Apply migrations in container
npm run migrate
```

> **Tip:** Use `makemigrations:local` during development for quicker feedback, then `migrate` to apply in the container.

### Running Tests

```bash
# All tests with NX caching
npm run test

# Tests with coverage reports
npm run test:coverage
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
