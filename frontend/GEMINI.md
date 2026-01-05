# Frontend Context (React + Vite)

## Overview

This is a **React 19** Single Page Application (SPA) built with **Vite 7**. It serves as the user interface for the Alpaca Wrapper, featuring real-time data visualization, interactive charts, and dashboard management.

## Architecture

### Feature-Based Structure (`src/features`)

The codebase is organized by **domain features** rather than technical layers. Each folder in `src/features/` contains the components, logic, and state relevant to that specific feature.

- **`accounts`**: User account management.
- **`assets`**: Stock/Crypto asset display and info.
- **`auth`**: Login, Signup, and protection logic.
- **`graphs`**: Charting components (Lightweight Charts/Chart.js).
- **`paperTrading`**: Interfaces for the trading simulator.
- **`watchlists`**: Watchlist management UI.

### State Management (`src/app`)

- **Redux Toolkit**: Used for global state.
- **`store.ts`**: The central Redux store configuration.
- **`analyticsMiddleware.ts`**: Custom middleware for tracking actions.

### UI & Styling

- **Tailwind CSS**: Utility-first styling.
- **Radix UI**: Headless, accessible UI primitives (Dialogs, Dropdowns, etc.).
- **Icons**: `react-icons` and `lucide-react`.

## Key Technologies

- **Build Tool**: Vite 7 (SWC plugin for fast compilation).
- **Language**: TypeScript.
- **Charts**: `lightweight-charts` (TradingView style) and `react-chartjs-2`.
- **Forms**: `react-hook-form` + `zod` for validation.
- **Data Fetching**: Likely `axios` or standard `fetch` (check `src/shared` for API clients).

## Development Workflow

### Commands

- **Start Dev Server**:
  ```bash
  npm run dev:frontend
  ```
  _Runs on port 5173 by default._
- **Build for Production**:
  ```bash
  npm run build
  ```
  _Output is generated in `dist/`._
- **Lint & Format**:
  ```bash
  npm run lint
  npm run format
  ```

### Conventions

- **Components**: PascalCase (e.g., `StockChart.tsx`).
- **Hooks**: camelCase, prefixed with `use` (e.g., `useMarketData.ts`).
- **Slices**: Redux slices should be located within their respective feature folder.
- **Strict Mode**: React Strict Mode is enabled.

## Directory Map

```text
frontend/
├── src/
│   ├── app/            # Redux store and app-wide configs
│   ├── features/       # Feature modules (The core logic)
│   ├── shared/         # Reusable UI components and utils
│   ├── landing/        # Landing page specific code
│   ├── App.tsx         # Root component/Router setup
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── vite.config.ts      # Vite configuration
└── tailwind.config.js  # Tailwind configuration
```
