# Repository Guidelines

## Project Structure & Module Organization

- `backend/`: Django API and services. Apps live in `backend/apps/`, settings in `backend/main/`.
- `frontend/`: React + Vite SPA. Source in `frontend/src/`, static assets in `frontend/public/`.
- `docs/`: Architecture and documentation assets.
- `charts/`: Helm charts for deployment (`charts/alpaca-main/`).
- `docker-compose.yaml`: Local infrastructure (Postgres, Redis, backend, workers).
- `scripts/`: Setup and install helpers.

## Build, Test, and Development Commands

- `npm install`: Runs prerequisite checks and installs frontend/backend deps.
- `npm run dev`: Start frontend dev server and Docker services via Nx.
- `npm run dev:frontend`: Frontend only (expects backend services running).
- `npm run dev:backend`: Backend infrastructure via Docker Compose.
- `npm run lint` / `npm run lint:fix`: Lint (and fix) both projects.
- `npm run format` / `npm run format:check`: Format or validate formatting.
- `npm run test` / `npm run test:coverage`: Run tests (with coverage).
- `npm run build`: Build the frontend for production.
- `npm run migrate` / `npm run makemigrations`: Django migrations.
- `npm run docker:up|down|logs|clean`: Manage Docker services.

## Coding Style & Naming Conventions

- Python: Black with 88-char lines and Ruff linting. Use `snake_case` for modules
  and functions. Django apps are organized under `backend/apps/`.
- TypeScript/React: Prettier (2 spaces, single quotes, semicolons) and ESLint.
  Use `PascalCase` for components and `camelCase` for functions/vars.

## Testing Guidelines

- Backend: `pytest` with `pytest-django`. Tests live under `backend/apps/**`
  and follow `tests.py`, `test_*.py`, or `*_test.py` naming.
- Frontend: `vitest` with React Testing Library; tests typically use
  `*.test.tsx` or `__tests__/` folders.
- Run `npm run test` for the full suite or `npm run test:coverage` for reports.

## Commit & Pull Request Guidelines

- Commit messages follow a conventional style: `feat:`, `fix:`, `chore:`,
  `refactor:`, `build(deps):`.
- PRs should include a clear description, testing notes, linked issues,
  and screenshots for UI changes.

## Security & Configuration Tips

- Store Alpaca credentials in `.envs/.env`. Never commit secrets.
- Review `docker-compose.local.yaml` for local overrides.
