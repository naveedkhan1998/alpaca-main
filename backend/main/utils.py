"""
Cache utilities for accessing Redis client and other cache operations.
"""

from django.core.cache import cache
import redis


def get_redis_client(alias: str = "default") -> redis.Redis:
    """
    Get the raw Redis client instance from Django's cache framework.

    Args:
        alias: The cache alias to use (defaults to "default")

    Returns:
        redis.Redis: The Redis client instance

    Raises:
        AttributeError: If the cache backend is not Redis
        ValueError: If the specified cache alias doesn't exist
    """
    try:
        return cache.client.get_client(alias)
    except Exception as e:
        raise ValueError(f"Failed to get Redis client for alias '{alias}': {e}") from e


def get_cache_client(alias: str = "default") -> redis.Redis | None:
    """
    Safely get the Redis client with error handling.

    Args:
        alias: The cache alias to use (defaults to "default")

    Returns:
        redis.Redis or None: The Redis client instance or None if unavailable
    """
    try:
        return get_redis_client(alias)
    except (AttributeError, ValueError) as e:
        from celery.utils.log import get_task_logger

        logger = get_task_logger(__name__)
        logger.error(f"Failed to get Redis client: {e}")
        return None
