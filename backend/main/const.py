WEBSOCKET_HEARTBEAT_KEY = "ticks_received"
WEBSOCKET_HEARTBEAT_TTL = 100


AUTH_PROVIDERS = {
    "email": "email",
    "google": "google",
    "facebook": "facebook",
    "twitter": "twitter",
}


def websocket_user_lock(user_id: int) -> str:
    """
    Generate a unique lock key for a user to prevent multiple WebSocket connections.
    """
    return f"websocket_start-user-{user_id}"


def websocket_subscription_queue(user_id: int) -> str:
    """
    Generate a unique Redis queue name for user subscriptions.
    """
    return f"user:{user_id}:subscriptions"


def websocket_unsubscription_queue(user_id: int) -> str:
    """
    Generate a unique Redis queue name for user unsubscriptions.
    """
    return f"user:{user_id}:unsubscriptions"
