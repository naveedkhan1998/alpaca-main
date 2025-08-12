from rest_framework.pagination import LimitOffsetPagination


class OffsetPagination(LimitOffsetPagination):
    default_limit = 100
    max_limit = 1000


class CandleBucketPagination(LimitOffsetPagination):
    default_limit = 100
    max_limit = 1000
