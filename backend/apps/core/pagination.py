from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response


class OffsetPagination(LimitOffsetPagination):
    default_limit = 100
    max_limit = 1000


class CandleBucketPagination(LimitOffsetPagination):
    default_limit = 100
    max_limit = 1000
