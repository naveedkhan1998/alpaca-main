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

    def get_ident(self, request):
        # Prefer Cloudflare's client IP header, fallback to leftmost XFF.
        cf_ip = request.META.get("HTTP_CF_CONNECTING_IP")
        if cf_ip:
            return cf_ip
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        if xff:
            return xff.split(",")[0].strip()
        return super().get_ident(request)


class PublicReadOnlyMixin:
    permission_classes = [ReadOnlyOrAuthenticated]
    throttle_classes = [PublicReadAnonThrottle]
