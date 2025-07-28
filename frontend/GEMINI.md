## Codebase Overview: Breeze Trading App (Frontend)

This document provides a detailed overview of the React frontend application for the Breeze Trading App, covering its architecture, state management (Redux), and styling.

### 1. Redux Implementation

- **Redux Toolkit:** The application leverages Redux Toolkit for efficient and streamlined state management.
- **RTK Query:** API interactions are handled using RTK Query, integrated through `baseApi.tsx`. This includes dynamic base URL selection (localhost vs. production) and automatic attachment of authorization headers.
- **Authentication State:** The `authSlice.ts` manages user authentication, including actions for setting and clearing credentials (`setCredentials`, `logOut`). Initial authentication state is derived from `LocalStorageService`.
- **Redux Hooks:** Custom typed hooks (`useAppDispatch`, `useAppSelector`) are defined in `src/app/hooks.ts` to ensure type safety when interacting with the Redux store.
- **Token Management:** Authentication tokens are managed using `js-cookie` (via `src/app/api/auth.ts`), storing and retrieving tokens from browser cookies.

### 2. Styling

- **Tailwind CSS:** The primary styling framework is Tailwind CSS, providing a utility-first approach to styling.
- **Configuration:** `tailwind.config.js` is configured with custom colors (defined using CSS variables for theming), extended border-radius values, custom keyframes, and animations. It also includes `tailwindcss-animate` for pre-built animations.
- **PostCSS:** `postcss.config.js` confirms the use of `tailwindcss` and `autoprefixer`, which are standard PostCSS plugins for Tailwind setups.
- **Global Styles & Theming:** `src/index.css` defines global styles, including CSS variables for a comprehensive color palette (supporting light and dark modes), custom scrollbar styling, and utility classes for visual effects like glassmorphism. The `ThemeProvider` component (likely from Shadcn UI) is used to manage theme switching.
- **Shadcn UI:** The presence of numerous component files in `src/components/ui/` (e.g., `accordion.tsx`, `button.tsx`, `dialog.tsx`) strongly indicates the use of Shadcn UI, a collection of re-usable components built with Radix UI and Tailwind CSS.
- **App.css:** `src/App.css` is empty, indicating that all global and component-specific styling is handled through Tailwind CSS and `src/index.css`.

### 3. Application Architecture

- **Entry Point:** The application's entry point is `src/main.tsx`, which renders the main `App` component, wrapped in the Redux `Provider` and `React.StrictMode`.
- **Main Application Component (`App.tsx`):**
  - Handles client-side routing using `react-router-dom`.
  - Implements `PrivateRoute` components to protect routes based on user authentication status (checking the Redux store).
  - Manages a loading screen and performs periodic health checks to the backend API.
  - Integrates global UI components such as `AnnouncementBanner`, `Toast`, and `Toaster`.
  - Utilizes `ThemeProvider` for consistent theming across the application.
- **Page Components (`src/pages/`):** Contains individual page components (e.g., `HomePage.tsx`, `InstrumentsPage.tsx`, `LoginRegPage.tsx`), ensuring a clear separation of concerns for different application views.
- **Reusable Components (`src/components/`):** Houses a variety of reusable UI components, including application-specific components (e.g., `ChartControls.tsx`, `Login.tsx`) and the Shadcn UI components within `src/components/ui/`.
- **Utility Functions (`src/lib/`):** Contains `common-functions.ts`, `common-types.ts`, and `utils.ts`, which are likely used for shared utility functions, helper methods, and common type definitions across the application.
- **Custom Hooks (`src/hooks/`):** Includes custom React hooks (e.g., `use-mobile.tsx`, `use-toast.ts`, `useResizeObserver.ts`) to encapsulate and reuse specific logic and functionalities.
