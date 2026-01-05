# Repository Guidelines

## Project Structure & Module Organization

- `apps/`: Django apps (e.g., `account`, `core`, `paper_trading`). Add new app modules here.
- `main/`: Project configuration (`settings`, `urls`, `asgi.py`, `wsgi.py`).
- `scripts/`: Utility scripts and Docker entrypoints.
- `pytest.ini`: Test discovery and Django settings for pytest.
- `pyproject.toml`: Python dependencies plus Black/Ruff configuration.

## Build, Test, and Development Commands

- From repo root: `npm run dev:backend` to start backend services via Docker Compose.
- `npm run migrate` / `npm run makemigrations`: Run Django migrations via Nx.
- Local (backend dir): `uv sync` to install Python deps, then
  `uv run python manage.py runserver 0.0.0.0:8000`.
- `pytest`: Run backend tests (uses `DJANGO_SETTINGS_MODULE=main.settings.test`).

## Coding Style & Naming Conventions

- Python uses Black (line length 88) and Ruff. Stick to 4-space indentation.
- Modules, functions, and variables use `snake_case`; classes use `PascalCase`.
- Django apps should remain modular and independent; reuse shared logic in `apps/core`.

## Testing Guidelines

- Framework: `pytest` + `pytest-django`.
- Test locations: `apps/**` using `tests.py`, `test_*.py`, or `*_test.py`.
- Prefer unit tests for services and serializers; add integration tests for API views.

## Commit & Pull Request Guidelines

- Follow Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`).
- PRs should include a clear summary, testing notes, and linked issues.

## Security & Configuration Tips

- Store secrets in `.envs/.env`; never commit credentials.
- Avoid hard-coding API keys or service tokens in code or fixtures.
