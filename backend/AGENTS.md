# Repository Guidelines

## Project Structure & Module Organization
- `apps/` contains Django apps (`account`, `core`, `home`, `paper_trading`) with API views, models, serializers, and fixtures. Keep shared utilities in `apps/core`.
- `main/` stores project wiring such as settings modules, Celery bootstrap, ASGI, WSGI, and helpers that stay framework oriented.
- `scripts/` includes operational helpers like `run_backend.sh`, Celery workers, and Flower monitors; update these when service entry points change.
- Static assets live in `staticfiles/`, while templates belong under each app `templates/` folder to keep domains separated.

## Build, Test, and Development Commands
- `uv sync` installs dependencies locked in `uv.lock` using the repository Python toolchain.
- `uv run manage.py migrate` applies migrations; run `uv run manage.py makemigrations` before raising schema pull requests.
- `uv run manage.py runserver` launches the Django development server on `localhost:8000`.
- `uv run pytest` executes the suite, and `uv run pytest --cov` reports coverage for dashboards.
- `docker compose up -d` starts the full backend stack defined at the repository root when services like Redis or Postgres are required.

## Coding Style & Naming Conventions
- Format with Black via `uvx black .` and lint with Ruff via `uvx ruff check .`; both target Python 3.13 and an 88 character limit.
- Use four space indentation, `snake_case` for functions and modules, `PascalCase` for models, and `SCREAMING_SNAKE_CASE` for configuration constants.
- Order imports by standard library, third party, then first party (`backend`) to satisfy the Ruff isort profile. Prefer explicit absolute imports between apps.

## Testing Guidelines
- Rely on `pytest` with `pytest-django`; keep tests alongside their app code (`apps/<app>/tests/` or `tests.py`) and name modules `test_*.py`.
- Mock external services such as Alpaca and Google Cloud, and place reusable fixtures in `conftest.py`.
- Target meaningful coverage with `uv run pytest --cov`; document unavoidable gaps in the pull request description.

## Commit & Pull Request Guidelines
- Follow Conventional Commit prefixes already in history (`feat:`, `fix:`, `style:`, etc.) and keep subjects near 72 characters.
- Squash work in progress commits before opening a pull request, link issues, and call out environment or migration updates explicitly.
- Provide automated test output or manual verification steps plus screenshots or logs whenever a behavioral change lands.

## Security & Configuration Notes
- Never commit secrets; rely on the shared `.env` files referenced by Docker and Nx tasks, and record new variables in pull request checklists.
- Audit consumers of `gcpCredentials.json` and scripts before rotating keys, and sanitize sample data or logs before posting them.
