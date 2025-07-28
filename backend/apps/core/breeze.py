import logging

from breeze_connect import BreezeConnect
from django.shortcuts import get_object_or_404

from apps.core.models import BreezeAccount

logger = logging.getLogger(__name__)


class BreezeSessionManager:
    """
    Class to manage BreezeConnect sessions for multiple users.
    Sessions are stored in a dictionary keyed by user ID.
    """

    def __init__(self):
        """
        Initializes the BreezeSessionManager instance.
        """
        self.sessions = {}

    def refresh_session(self, user_id):
        """
        Refreshes the session for a user by clearing the old one and creating a new one.

        Args:
            user_id (int): The ID of the user whose session needs to be refreshed.

        Returns:
            BreezeConnect: The new BreezeConnect session for the user.
        """
        # Clear the existing session first
        self.clear_session(user_id)

        # Initialize a new session
        return self.initialize_session(user_id)

    def initialize_session(self, user_id):
        """
        Initializes or retrieves a session for the specified user.

        Args:
            user_id (int): The ID of the user for whom the session is being initialized.

        Returns:
            BreezeConnect: The BreezeConnect session for the user.
        """
        if user_id in self.sessions:
            logger.info(f"Reusing existing BreezeSession for user {user_id}.")
            return self.sessions[user_id]

        # Initialize a new session for the user
        acc = get_object_or_404(BreezeAccount, user__id=user_id)
        breeze = BreezeConnect(api_key=acc.api_key)

        try:
            breeze.generate_session(
                api_secret=acc.api_secret, session_token=acc.session_token
            )
            self.sessions[user_id] = breeze
            logger.info(f"BreezeSession initialized for user {user_id}.")
            return breeze
        except Exception as e:
            logger.error(f"Failed to initialize BreezeSession for user {user_id}: {e}")
            # Clear any potentially corrupted session
            self.clear_session(user_id)
            raise e

    def get_session(self, user_id):
        """
        Retrieves the session for a user, if it exists.

        Args:
            user_id (int): The ID of the user.

        Returns:
            BreezeConnect or None: The existing session, or None if not initialized.
        """
        return self.sessions.get(user_id)

    def clear_session(self, user_id):
        """
        Clears the session for a specified user.

        Args:
            user_id (int): The ID of the user whose session is to be cleared.
        """
        if user_id in self.sessions:
            del self.sessions[user_id]
            logger.info(f"Session cleared for user {user_id}.")

    def clear_all_sessions(self):
        """
        Clears all stored sessions.
        """
        self.sessions.clear()
        logger.info("All sessions cleared.")


# Instantiate a global BreezeSessionManager
breeze_session_manager = BreezeSessionManager()
