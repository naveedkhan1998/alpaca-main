
# Alpaca API Wrapper

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
  - [Development Workflow](#development-workflow)
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

| Category               | What you get                                                                 |
| ---------------------- | ---------------------------------------------------------------------------- |
| **Watchlists**         | Create watchlists, add assets, and manage your market focus                  |
| **Historical Data**    | Assets in watchlists fetch and cache historical OHLCV data automatically     |
| **Real-Time Data**     | Assets in watchlists are subscribed to real-time Alpaca market feeds         |
| **WebSocket Service**  | Dedicated Django management command runs in its own container, handling      |
|                        | real-time tick processing and candle aggregation (1m and higher timeframes)  |
| **Interactive Analysis**| Access and experiment with real-time and historical data for your watchlists |
| **Session management** | Secure session generation with your API key & secret                         |
| **Task orchestration** | Celery + Redis for async jobs & scheduling                                   |
| **Dockerised stack**   | `docker compose up` and you're done                                          |

---

## Tech Stack

| Layer                 | Tech                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------- |
| **Backend**           | Django · Django REST Framework                                                          |
| **Async / broker**    | Celery · Redis                                                                          |
| **Realtime**          | Django Channels (WebSockets)                                                            |
| **Frontend**          | React · Vite                                                                            |
| **Database**          | PostgreSQL                                                                              |
| **Container / infra** | Docker · Docker Compose · Nginx (reverse proxy)                                         |
| **Dev tooling**       | `uv` (deps) · `black` (format) · `ruff` (lint) · `pytest` (tests) · `vitest` (FE tests) |

---


## Architecture

```
        ┌──────────────────────┐
        │   Users / Clients    │
        └─────────┬────────────┘
                  │ HTTP / WebSocket
            ┌─────┴─────────────┐
            │                   │                        
      ┌─────▼─────┐       ┌─────▼─────┐       
      │   Nginx   │       │   Flower  │        
      │ (8000)    │       │  (5555)   │        
      │ Reverse   │       │ Dashboard │       
      │  Proxy    │       └───────────┘        
      └─────┬─────┘
            │
      ┌─────┴─────────────┬────────────────────────┐
      │                   │                        │
┌─────▼─────┐       ┌─────▼────────────┐ ┌─────────▼────────────┐ 
│ Frontend  │       │  Django Backend  │ │ WebSocket Service    │
│ React +   │       │  API (ASGI)      │ │ (Django mgmt cmd,    │
│  Vite     │       └─────┬────────────┘ │  separate container) │
└───────────┘             │              └──────────────────────┘
                          │
                          │
                          │
          ┌───────────────┼───────────────┐
          │               │               │
   ┌──────▼───────┐ ┌─────▼───────┐ ┌─────▼───────┐
   │ PostgreSQL   │ │   Redis     │ │   Celery    │
   │   DB         │ │   Broker    │ │ Workers +   │
   │              │ │ / Cache     │ │   Beat      │
   └──────────────┘ └─────────────┘ └─────────────┘
      ▲                               │
      │                               │
      └──────────── Task Queue ───────┘
```

### Service Breakdown

| Service            | Purpose                 | Port     | Notes                          |
| ------------------ | ----------------------- | -------- | ------------------------------ |
| **Nginx**          | Reverse proxy           | 8000     | Routes to frontend/backend     |
| **Frontend**       | React SPA               | Internal | Served via Nginx               |
| **Backend**        | Django API + WebSockets | Internal | ASGI server with Channels      |
| **PostgreSQL**     | Primary database        | Internal | Persistent data storage        |
| **Redis**          | Cache + Message broker  | Internal | Celery task queue              |
| **Celery Workers** | Background tasks        | Internal | Async job processing           |
| **Celery Beat**    | Task scheduler          | Internal | Periodic task execution        |
| **Flower**         | Task monitoring         | 5555     | Direct access (bypasses Nginx) |

> All services (backend, frontend, db, cache, broker, workers, beat, Flower & Nginx) are defined in **`docker-compose.yml`**.

---

## Prerequisites

- **Docker** & **Docker Compose** installed
- An **Alpaca API** key & secret

---

## Installation

```bash
git clone https://github.com/naveedkhan1998/alpaca-main.git
cd alpaca-main

# Build and start all services
docker compose up
```

Docker Compose will:

1. Build the backend, frontend and Nginx images
2. Pull official images for Postgres & Redis
3. Spin up Celery workers, beat scheduler and Flower dashboard

---

## Running the Application

Once the stack is up, you can access:

- **Main Application**: [http://localhost:8000](http://localhost:8000) — React SPA with API endpoints
- **Celery Flower Dashboard**: [http://localhost:5555](http://localhost:5555) — Task monitoring

> **Note:** Nginx handles internal routing between frontend (`/`) and backend API (`/api/…`) on port 8000. WebSocket connections (`/ws/…`) are also routed through Nginx.

---

## Development Workflow

Both backend and frontend code are mounted as volumes, so changes hot‑reload instantly.

```bash
# backend tests
docker compose exec backend pytest

# FE dev server (if you prefer Vite's dev mode)
docker compose exec frontend pnpm dev
```

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
- [Django](https://www.djangoproject.com/) & [Django REST Framework](https://www.django-rest-framework.org/) - Web framework and API toolkit
- [Django Channels](https://channels.readthedocs.io/) - WebSocket support for Django
- [Celery](https://docs.celeryproject.org/) - Distributed task queue
- [Redis](https://redis.io/) - In-memory data structure store
- [PostgreSQL](https://www.postgresql.org/) - Powerful, open source object-relational database
- [React](https://reactjs.org/) & [Vite](https://vitejs.dev/) - Frontend framework and build tool

### Infrastructure & DevOps

- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/) - Containerization platform
- [Nginx](https://www.nginx.com/) - Web server and reverse proxy
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
