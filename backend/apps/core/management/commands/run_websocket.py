"""
run_websocket.py
================

This module provides a Django management command to run the persistent WebSocket
client for streaming real-time trade data from Alpaca. The command is designed
to be run as a long-running background process.

Key functionalities:
- Defines the `run_websocket` management command.
- Fetches the active Alpaca account from the database to retrieve API credentials.
- Initializes and runs the `WebsocketClient` from the `websocket_service` module.
- Provides a clean and standard way to start the streaming service.

Usage:
To run the WebSocket client, use the following command:
`python manage.py run_websocket`
"""

import logging

from django.core.management.base import BaseCommand

from apps.core.services.websocket import WebsocketClient

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """Django management command to run the WebSocket client."""

    help = "Runs the persistent Alpaca WebSocket client to stream trade data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--sandbox",
            action="store_true",
            help="Run the WebSocket client in sandbox (paper trading) mode.",
        )

    def handle(self, *args, **options):
        """Handles the command execution."""
        try:
            # Initialize and run the WebSocket client
            sandbox = bool(options.get("sandbox"))
            client = WebsocketClient(sandbox=sandbox)
            client.run()

        except Exception as e:
            logger.error(f"Failed to start WebSocket client: {e}", exc_info=True)
            self.stdout.write(self.style.ERROR(f"An unexpected error occurred: {e}"))
