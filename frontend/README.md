# Alpaca Wrapper - Frontend

## ⚛️ Project Overview
This is the React-based frontend for the Alpaca Wrapper application. Built with **Vite 7** and **TypeScript**, it delivers a high-performance, real-time user interface for monitoring stock data and managing trading portfolios.

## 🛠 Tech Stack
*   **Framework:** React 19
*   **Build Tool:** Vite 7
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS, Radix UI
*   **State Management:** Redux Toolkit
*   **Charting:** Lightweight Charts, Chart.js

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm

### Installation
Dependencies are managed at the root level via npm workspaces, but can be installed here:
```bash
npm install
```

### Development
Start the development server with Hot Module Replacement (HMR):
```bash
npm run dev
```
*App will run at [http://localhost:5173](http://localhost:5173)*

## 📂 Project Structure
The `src/` directory is organized by feature:
*   **`features/`**: Self-contained modules for business logic (e.g., `auth`, `watchlists`, `assets`).
*   **`app/`**: Global Redux store and app-wide configuration.
*   **`shared/`**: Reusable UI components and helper functions.

## 🧪 Testing
Run unit and integration tests with Vitest:
```bash
npm run test
```

## 📝 Code Quality
*   **Linting**: ESLint
*   **Formatting**: Prettier
*   **Commands**:
    ```bash
    npm run lint
    npm run format
    ```
