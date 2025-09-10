# Frontend Agents Guide

This document orients agents working on the frontend. It summarizes the tech stack, project conventions, and the major feature modules that were recently refactored for clarity and extensibility.

## Tech & Tooling

- Framework: React 18 + TypeScript
- Styling: Tailwind CSS, design tokens via CSS variables
- Component primitives: shadcn/ui (Radix + Tailwind wrappers)
- State: Redux Toolkit + RTK Query
- Charts: Trading view lightweight-charts
- Router: react-router-dom v6
- Animations: framer-motion (light usage)
- Testing: Vitest + @testing-library/react
- Build: Vite

Useful scripts (from `frontend/`):

- `npm run dev` – local dev server
- `npm run type-check` – TypeScript checks (fast feedback)
- `npm run test` or `npm run test:run` – run tests

Note: If you hit a Rollup optional-dependency issue locally, run `npm ci` to reset `node_modules` (known npm quirk with native rollup bundles).

## Design System & Theming

- Colors and tokens are declared in `src/index.css` under `:root` (light) and `.dark` (dark). Do not rename variables; components across the app depend on these token names.
- Tailwind extends these tokens in `tailwind.config.js` (e.g. `colors.background` maps to `--background`).
- Gradients:
  - `bg-trading-gradient` for subtle chart backgrounds
  - `bg-surface-gradient` for section headers and page headers

Keep consistency by using semantic classes (e.g. `bg-card`, `text-foreground`, `border-border`) instead of hard-coded colors.

## Layout & Global UI

- `shared/components/PageLayout.tsx`

  - Provides unified page chrome: header, subheader, actions, and content sections.
  - Variants: `default`, `clean`, `full-width`.
  - Recent improvement: header content is placed in a subtle surface gradient container for readability.

- `shared/components/Navbar.tsx`

  - Desktop: brand + center nav + right actions (theme, health, user menu).
  - Mobile: brand + actions + drawer navigation (profile + main links + settings/sign out).
  - Avoid introducing per-page nav; keep routes centralized in this component.

- `shared/components/AnnouncementBanner.tsx`

  - Dismissible banner (persisted in `localStorage`).
  - Hidden in development.

- `shared/components/ModeToggle.tsx`

  - Theme toggle (light/dark) with tooltip.

- `shared/components/HealthStatus.tsx`

  - System health indicator + detailed dropdown.

- `shared/components/AlpacaStatusCard.tsx`
  - Connection status display with refresh.

## Graphs Feature (Modularized)

Entry: `src/features/graphs/index.tsx` orchestrates hooks and charts. The goal is a readable container with self-contained hooks for data and behavior.

Hooks (in `src/features/graphs/hooks/`):

- `useCandles` – Fetches and paginates candle data (initial, load-more, latest), exposes loading/hasMore flags and a `handleRefetch`.
- `useDerivedSeries` – Computes derived data for charts: OHLC/line series, volume series, EMA, RSI, ATR, Bollinger Bands.
- `useChartSync` – Synchronizes time ranges across charts via `ITimeScaleApi` refs.
- `useFullscreen` – Fullscreen toggle + Redux sync; container ref provided by the page.
- `useGraphShortcuts` – Keyboard shortcuts: F (fullscreen), V (volume), C (controls).
- `useResizeObserver` – Shared ResizeObserver for consistent chart sizing.

Chart utils (in `src/features/graphs/lib/`):

- `chartOptions.ts` – `getBaseChartOptions(mode)` returns theme-aware chart options.
- `createSeries.ts` – `createSeriesForType` encapsulates per-series styling.

Charts (in `src/features/graphs/components/`):

- `MainChart.tsx`, `VolumeChart.tsx`, `IndicatorChart.tsx` received polish and now rely on the hooks/utilities above and the shared `useResizeObserver`.
- `PanelHeader.tsx` – Reusable header for sub-panels (Volume/Indicators), supports an optional close action.
- `ChartToolbar.tsx` – Adaptive overlay; inline toolbar on desktop, popover on mobile.

When adding new indicators:

1. Compute in `useDerivedSeries`.
2. Render in an appropriate chart (main or indicator) with styling consistent with existing series.
3. Prefer theme tokens and `getBaseChartOptions` for colors.

## Watchlists & Instruments

Watchlists (`src/features/watchlists/`):

- `index.tsx` – Master-detail layout: sidebar list with search and segmented filters, details pane with info tiles and assets. Uses `PageLayout` header and actions.
- Subcomponents: `WatchListDetail.tsx`, `WatchListAssets.tsx`, `WatchListDialog.tsx`.

Instruments (`src/features/instruments/`):

- `index.tsx` – Filters sidebar with segmented exchange control; right pane with instrument list and descriptive header. Uses `Instrument.tsx` and `InstrumentItem.tsx`.
- `DurationSelector.tsx` – Dropdown control used by instrument items.

## Accounts & Contact

Accounts: `src/features/accounts/index.tsx`

- `AlpacaStatusCard` and a primary action to sync assets; actions surfaced via `PageLayout` actions header.

Contact: `src/features/contact/index.tsx`

- Clean two-column layout (info + form).
- Minimal anti-spam honeypot: hidden `company` field and a submission timing check. Keep this pattern for simple public forms unless server-side validation is available.

## State & Data

- Redux Toolkit slices live under features (e.g., `graphs/graphSlice.ts`, `health/healthSlice.ts`).
- RTK Query services under `src/shared/api/*Service.ts` (e.g., `assetService`, `watchlistService`, `alpacaService`).
- Prefer RTK Query for data fetching; avoid duplicating fetch logic in components.

## Coding Guidelines

- Prefer small, focused hooks for data and behavior; keep page components declarative.
- Use Tailwind with semantic token classes; avoid inline hard-coded colors.
- Keep variable and token names stable; components assume consistent keys (e.g., `--background`, `--card`, `--chart-1`).
- Type chart refs precisely: `useRef<ITimeScaleApi<Time> | null>(null)`.
- For new overlays or badges, use `glass-card`, `bg-surface-gradient`, `border-border/40` etc. for a consistent look.
- Favor composition over prop drilling; elevate data/behavior into hooks.

## Testing & Verification

- Prefer tests for new hooks (see `src/features/graphs/hooks/__tests__/*`).
- For visual changes, run `npm run dev` to verify across pages:
  - Graphs (toolbar, overlays, fullscreen)
  - Watchlists/Instruments (lists, filters, details)
  - Accounts/Contact (status card, form)
  - Navbar and AnnouncementBanner (dismiss persistence)

## Common Pitfalls

- Build/test optional-dep errors (Rollup): `npm ci` normally fixes them.
- Infinite Scroll/Chart Sync: ensure `useChartSync` is wired to timescale refs provided by charts; avoid ad-hoc subscriptions.
- Theme regressions: only change token values, not names.

## Extending the App (Examples)

- Add a new chart indicator:

  - Compute in `useDerivedSeries`.
  - Add a toggle in `watchlists`/controls pattern if needed.
  - Render in `MainChart` or `IndicatorChart` with consistent colors.

- Add a new page:

  - Use `PageLayout` with header/subheader/actions.
  - Stick to `border-border/40`, `bg-card`, and `bg-surface-gradient` for surfaces.
  - Add routes in `Navbar` as needed.

- Add a form:
  - Follow Contact form’s pattern; include honeypot+timing or plug into an actual backend verification.

## Contacts for Agents

- For cross-cutting refactors, start with a short plan and align with the patterns described above.
- Keep code changes narrowly scoped and consistent with the style.
- Ask for clarification before changing token names or shared contracts.
