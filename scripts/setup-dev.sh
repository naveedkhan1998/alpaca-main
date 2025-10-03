#!/bin/bash

echo ""
echo "========================================"
echo "  Alpaca Main - Development Setup"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "[ERROR] uv is not installed or not in PATH"
    echo "Please install uv: https://github.com/astral-sh/uv"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "[ERROR] Docker is not running or not installed"
    echo "Please start Docker"
    exit 1
fi

echo "[OK] All prerequisites are installed"
echo ""
echo "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo ""
    echo "[ERROR] Installation failed"
    exit 1
fi

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Start infrastructure: npm run docker:up"
echo "  2. Start frontend: npm run dev:frontend"
echo "  3. Access app at http://localhost:5173"
echo ""
