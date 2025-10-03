# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/`, organized by feature so UI logic stays close to data dependencies. Each module exposes an entry file under `src/features/<module>/` with hooks, Redux slices, and components colocated. Shared primitives, layouts, and utilities belong in `src/shared/`, while global tokens reside in `src/index.css` and `tailwind.config.js`. Static assets and the HTML shell live in `public/`. Promote any reusable helper to `src/shared` once it benefits more than one feature.

## Build, Test, and Development Commands
- `npm run dev`: start the Vite dev server with fast HMR.
- `npm run build`: generate the production bundle in `dist/`.
- `npm run preview`: serve the built bundle for final QA.
- `npm run type-check`: run TypeScript for rapid static validation.
- `npm run test` or `npm run test:run`: execute Vitest suites headlessly.

## Coding Style & Naming Conventions
Write TypeScript React function components with hooks. Use two-space indentation and keep Prettier plus ESLint defaults (`eslint.config.js`) intact. Tailwind classes should reference semantic tokens (`bg-card`, `text-muted-foreground`) instead of raw hex values. Name components in PascalCase (`MainChart.tsx`), hooks in camelCase (`useCandles.ts`), and colocate slices or RTK Query services with their feature folder.

## Testing Guidelines
Vitest with `@testing-library/react` covers unit and interaction scenarios. Place specs beside implementation files using the `*.test.ts(x)` suffix; hook tests belong in `src/features/<module>/hooks/__tests__/`. When adding derived data utilities, assert the numeric outputs or selector behavior rather than snapshotting markup. Run `npm run test` before pushing and expand coverage whenever behavior or charts change.

## Commit & Pull Request Guidelines
Follow Conventional Commits (for example, `feat: add ema overlay controls`) as seen in the history. Keep commits focused, document reasoning in the body when touching multiple surfaces, and avoid bundling unrelated refactors. Pull requests should explain intent, list risky areas, link issues or tickets, and attach screenshots or clips for UI updates. Confirm `npm run type-check`, `npm run test`, and manual smoke checks (`npm run dev` or `npm run preview`) before requesting review.

## Security & Configuration Tips
Never commit `.env` secrets; mirror changes in `.env.example` for onboarding. Add new remote integrations through RTK Query services in `src/shared/api` so caching and retries stay centralized. If Rollup optional dependencies break local builds, run `npm ci` from the repo root to refresh `node_modules` cleanly.
