# Repository Guidelines

## Project Structure & Module Organization
- `backend/` hosts the Django API, Celery, and Channels services; apps live in `backend/apps/`, settings in `main/`, and dependencies are tracked in `pyproject.toml` plus `uv.lock`.
- `frontend/` is a Vite/React workspace under `frontend/src/` with shared UI primitives in `components/` and static assets in `public/`.
- Monorepo orchestration sits in `nx.json` and each package `project.json`; infrastructure manifests live in `docker-compose*.yaml`, `charts/`, and `nginx/`.

## Build, Test, and Development Commands
- `npm run install:all` bootstraps root tooling, installs `frontend` dependencies, and syncs Python packages with `uv`.
- `npm run dev` runs both servers via NX; use `npm run dev:frontend` or `npm run dev:backend` for focused iterations (backend expects Docker services).
- `npm run docker:up`/`docker:down` manage Postgres, Redis, Celery, while `npm run build` emits the production frontend bundle.

## Coding Style & Naming Conventions
- Python is formatted with Black (88 cols) and linted by Ruff; keep Django apps lowercase with underscores and prefer dataclass-style service modules.
- Frontend TypeScript relies on Prettier (2-space indent) and ESLint's React Hooks rules; name components in PascalCase and hooks in camelCase.
- Shared UI lives in `frontend/src/components`; colocate feature logic under `frontend/src/features/<area>` and keep Tailwind utility classes readable.

## Testing Guidelines
- `npm run test` fans out through NX; limit scope with `npm run test:backend` (pytest against `main.settings.test`) or `npm run test:frontend` (Vitest + Testing Library).
- Backend tests live in `backend/apps/**/tests/` and follow `test_*.py` patterns per `pytest.ini`; use fixtures to isolate Alpaca API calls.
- Frontend specs belong beside code as `.test.tsx`/`.test.ts`; leverage `npm run test:frontend -- --ui` when investigating flakes and update snapshots intentionally.

## Commit & Pull Request Guidelines
- Git history favors conventional prefixes (`feat:`, `refactor:`, `fix:`); keep commits small, include schema migrations, and regenerate locks when dependencies change.
- Before opening a PR, run `npm run lint`, `npm run format:check`, and the relevant test commands; note any Docker or env prerequisites in the description.
- Link issues where possible, provide behaviour notes or UI screenshots, and flag configuration changes so reviewers can reproduce quickly.
