from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response


class OffsetPagination(LimitOffsetPagination):
    default_limit = 100
    max_limit = 1000

    def get_paginated_response(self, data):
        return Response(
            {
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "count": self.count,
                "data": data,
            }
        )


class CandleBucketPagination(LimitOffsetPagination):
    default_limit = 100
    max_limit = 1000

    def get_paginated_response(self, data):
        return Response(
            {
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "count": self.count,
                "data": data,
            }
        )
