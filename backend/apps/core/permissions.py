from rest_framework.permissions import SAFE_METHODS, BasePermission
from rest_framework.throttling import AnonRateThrottle


class ReadOnlyOrAuthenticated(BasePermission):
    """
    Allow anonymous users to read data, require authentication for writes.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)


class PublicReadAnonThrottle(AnonRateThrottle):
    scope = "public_read"


class PublicReadOnlyMixin:
    permission_classes = [ReadOnlyOrAuthenticated]
    throttle_classes = [PublicReadAnonThrottle]
