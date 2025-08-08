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

from apps.core.models import AlpacaAccount
from apps.core.services.websocket_service import WebsocketClient

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
            # Get the active Alpaca account
            account = AlpacaAccount.objects.filter(is_active=True).first()
            if not account:
                self.stdout.write(
                    self.style.ERROR("No active Alpaca account found in the database.")
                )
                return

            sandbox_mode = options["sandbox"]
            self.stdout.write(
                self.style.SUCCESS(
                    f"Starting WebSocket client for account: {account.name} in {'Sandbox' if sandbox_mode else 'Live'} mode"
                )
            )

            # Initialize and run the WebSocket client
            client = WebsocketClient(account_id=account.id, sandbox=sandbox_mode)
            client.run()

        except Exception as e:
            logger.error(f"Failed to start WebSocket client: {e}", exc_info=True)
            self.stdout.write(self.style.ERROR(f"An unexpected error occurred: {e}"))
