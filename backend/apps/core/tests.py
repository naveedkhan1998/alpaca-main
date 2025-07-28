import json
from unittest.mock import MagicMock, patch

from django.test import RequestFactory
import pytest
from rest_framework import status

from apps.core.views import BreezeAccountViewSet, InstrumentViewSet


class TestInstrumentViewSet:

    @pytest.fixture(autouse=True)
    def setup(self):
        self.factory = RequestFactory()
        self.view = InstrumentViewSet.as_view({"get": "list"})

    @patch("apps.core.views.InstrumentViewSet.filter_queryset")
    @patch("apps.core.views.Exchanges.objects")
    @patch("apps.core.views.Instrument.objects")
    @patch("apps.core.views.InstrumentViewSet.get_serializer")
    @patch("apps.core.views.InstrumentViewSet.permission_classes", new=[])
    def test_list_instruments_success(
        self,
        MockGetSerializer,
        MockExchangesObjects,
        MockInstrumentObjects,
        MockFilterQueryset,
    ):
        # Create a mock request
        request = self.factory.get(
            "/instruments/", {"exchange": "NSE", "search": "test"}
        )
        request.user = MagicMock()  # Mock the user
        request.user.is_authenticated = True  # Set is_authenticated to True

        # Mock Exchanges.objects.filter().last()
        mock_exchange = MagicMock()
        mock_exchange.title = "NSE"
        MockExchangesObjects.filter.return_value.last.return_value = mock_exchange

        # Mock the view's filter_queryset method to avoid database calls
        mock_queryset = MagicMock()
        mock_queryset.exists.return_value = True
        MockFilterQueryset.return_value = mock_queryset

        # Mock the serializer instance returned by get_serializer
        mock_serializer_instance = MagicMock()
        mock_serializer_instance.data = [{"id": 1, "name": "Test Instrument"}]
        MockGetSerializer.return_value = mock_serializer_instance

        # Call the view
        response = self.view(request)
        response.render()  # Render the response to access content
        response_data = json.loads(response.content)  # Parse content as JSON

        # Assertions
        assert response.status_code == status.HTTP_200_OK
        assert response_data["msg"] == "Ok"
        assert response_data["data"] == [{"id": 1, "name": "Test Instrument"}]

        MockGetSerializer.assert_called_once_with(mock_queryset, many=True)

    @patch("apps.core.views.InstrumentViewSet.permission_classes", new=[])
    @patch("apps.core.views.Exchanges.objects")
    def test_list_instruments_missing_exchange(self, MockExchangesObjects):
        request = self.factory.get("/instruments/", {"search": "test"})
        request.user = MagicMock()
        request.user.is_authenticated = True
        response = self.view(request)
        response.render()
        response_data = json.loads(response.content)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response_data["msg"] == "Exchange is required"

    @patch("apps.core.views.InstrumentViewSet.permission_classes", new=[])
    @patch("apps.core.views.Exchanges.objects")
    def test_list_instruments_short_search_term(self, MockExchangesObjects):
        # Mock the exchange lookup to return a valid exchange
        mock_exchange = MagicMock()
        mock_exchange.title = "NSE"
        MockExchangesObjects.filter.return_value.last.return_value = mock_exchange

        request = self.factory.get("/instruments/", {"exchange": "NSE", "search": "t"})
        request.user = MagicMock()
        request.user.is_authenticated = True  # Set is_authenticated to True
        response = self.view(request)
        response.render()
        response_data = json.loads(response.content)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response_data["msg"] == "Search term must be at least 2 characters long"

    @patch("apps.core.views.Exchanges.objects")
    @patch("apps.core.views.Instrument.objects")
    @patch(
        "apps.core.views.InstrumentViewSet.permission_classes", new=[]
    )  # Patch permission_classes
    def test_list_instruments_invalid_exchange(
        self, MockInstrumentObjects, MockExchangesObjects
    ):
        request = self.factory.get(
            "/instruments/", {"exchange": "INVALID", "search": "test"}
        )
        request.user = MagicMock()
        request.user.is_authenticated = True  # Set is_authenticated to True

        MockExchangesObjects.filter.return_value.last.return_value = None
        response = self.view(request)
        response.render()
        response_data = json.loads(response.content)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response_data["msg"] == "Invalid Exchange"
        MockExchangesObjects.filter.assert_called_once_with(title="INVALID")

    @patch("apps.core.views.InstrumentViewSet.filter_queryset")
    @patch("apps.core.views.Exchanges.objects")
    @patch("apps.core.views.Instrument.objects")
    @patch("apps.core.views.InstrumentViewSet.get_serializer")
    @patch("apps.core.views.InstrumentViewSet.permission_classes", new=[])
    def test_list_instruments_no_instruments_found(
        self,
        MockGetSerializer,
        MockInstrumentObjects,
        MockExchangesObjects,
        MockFilterQueryset,
    ):
        request = self.factory.get(
            "/instruments/", {"exchange": "NSE", "search": "nomatch"}
        )
        request.user = MagicMock()
        request.user.is_authenticated = True

        mock_exchange = MagicMock()
        mock_exchange.title = "NSE"
        MockExchangesObjects.filter.return_value.last.return_value = mock_exchange

        # Mock the view's filter_queryset method to return empty queryset
        mock_queryset = MagicMock()
        mock_queryset.exists.return_value = False
        MockFilterQueryset.return_value = mock_queryset

        response = self.view(request)
        response.render()
        response_data = json.loads(response.content)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response_data["msg"] == "No instruments found"

        MockExchangesObjects.filter.assert_called_once_with(title="NSE")
        MockGetSerializer.assert_not_called()  # Serializer should not be called if no instruments found


class TestBreezeAccountViewSet:

    @pytest.fixture(autouse=True)
    def setup(self):
        self.factory = RequestFactory()
        self.view_list = BreezeAccountViewSet.as_view({"get": "list"})
        self.view_create = BreezeAccountViewSet.as_view({"post": "create"})
        self.view_update = BreezeAccountViewSet.as_view({"patch": "update"})
        self.view_breeze_status = BreezeAccountViewSet.as_view(
            {"get": "get_breeze_status"}
        )
        self.view_start_websocket = BreezeAccountViewSet.as_view(
            {"post": "start_websocket"}
        )
        self.view_refresh_session = BreezeAccountViewSet.as_view(
            {"post": "refresh_session"}
        )

    @patch("apps.core.views.BreezeAccount.objects")
    @patch("apps.core.views.BreezeAccountViewSet.get_serializer")
    @patch("apps.core.views.BreezeAccountViewSet.permission_classes", new=[])
    def test_list_breeze_accounts_success(
        self, MockGetSerializer, MockBreezeAccountObjects
    ):
        request = self.factory.get("/breeze_accounts/")
        request.user = MagicMock(id=1)  # Mock the user object with an id
        request.user.is_authenticated = True

        mock_queryset = MagicMock()
        mock_queryset.exists.return_value = True
        MockBreezeAccountObjects.filter.return_value = mock_queryset

        mock_serializer_instance = MagicMock()
        mock_serializer_instance.data = [{"id": 1, "api_key": "test_key"}]
        MockGetSerializer.return_value = mock_serializer_instance

        response = self.view_list(request)
        response.render()
        response_data = json.loads(response.content)

        assert response.status_code == status.HTTP_200_OK
        assert response_data["msg"] == "Okay"
        assert response_data["data"] == [{"id": 1, "api_key": "test_key"}]
        MockBreezeAccountObjects.filter.assert_called_once_with(user=request.user)
        MockGetSerializer.assert_called_once_with(mock_queryset, many=True)

    @patch("apps.core.views.BreezeAccount.objects")
    @patch("apps.core.views.BreezeAccountViewSet.permission_classes", new=[])
    def test_list_breeze_accounts_not_found(self, MockBreezeAccountObjects):
        request = self.factory.get("/breeze_accounts/")
        request.user = MagicMock(id=1)
        request.user.is_authenticated = True

        mock_queryset = MagicMock()
        mock_queryset.exists.return_value = False
        MockBreezeAccountObjects.filter.return_value = mock_queryset

        response = self.view_list(request)
        response.render()
        response_data = json.loads(response.content)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response_data["msg"] == "No accounts found"
        MockBreezeAccountObjects.filter.assert_called_once_with(user=request.user)

    @patch("apps.core.views.BreezeAccountViewSet.get_serializer")
    @patch("apps.core.views.BreezeAccountViewSet.permission_classes", new=[])
    def test_create_breeze_account_success(self, MockGetSerializer):
        request = self.factory.post(
            "/breeze_accounts/", {"api_key": "new_key"}, content_type="application/json"
        )
        request.user = MagicMock(id=1)
        request.user.is_authenticated = True

        mock_serializer_instance = MagicMock()
        mock_serializer_instance.is_valid.return_value = True
        mock_serializer_instance.data = {"id": 2, "api_key": "new_key"}
        MockGetSerializer.return_value = mock_serializer_instance

        response = self.view_create(request)
        response.render()
        response_data = json.loads(response.content)

        assert response.status_code == status.HTTP_201_CREATED
        assert response_data["msg"] == "Account created successfully"
        assert response_data["data"] == {"id": 2, "api_key": "new_key"}
        mock_serializer_instance.is_valid.assert_called_once_with()
        mock_serializer_instance.save.assert_called_once_with(user=request.user)

    @patch("apps.core.views.BreezeAccountViewSet.get_serializer")
    @patch("apps.core.views.BreezeAccountViewSet.permission_classes", new=[])
    def test_create_breeze_account_invalid_data(self, MockGetSerializer):
        request = self.factory.post(
            "/breeze_accounts/", {"api_key": ""}, content_type="application/json"
        )
        request.user = MagicMock(id=1)
        request.user.is_authenticated = True

        mock_serializer_instance = MagicMock()
        mock_serializer_instance.is_valid.return_value = False
        mock_serializer_instance.errors = {"api_key": ["This field may not be blank."]}
        MockGetSerializer.return_value = mock_serializer_instance

        response = self.view_create(request)
        response.render()
        response_data = json.loads(response.content)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response_data == {"api_key": ["This field may not be blank."]}
        mock_serializer_instance.is_valid.assert_called_once_with()
        mock_serializer_instance.save.assert_not_called()

    @patch("apps.core.views.BreezeAccount.objects")
    @patch("apps.core.views.get_object_or_404")
    @patch("apps.core.views.BreezeAccountViewSet.get_serializer")
    @patch("apps.core.views.breeze_session_manager")
    @patch("apps.core.views.manual_start_websocket")
    @patch("apps.core.views.BreezeAccountViewSet.permission_classes", new=[])
    def test_update_breeze_account_success(
        self,
        MockManualStartWebsocket,
        MockBreezeSessionManager,
        MockGetSerializer,
        MockGetObjectOr404,
        MockBreezeAccountObjects,
    ):
        request = self.factory.patch(
            "/breeze_accounts/1/",
            {"api_key": "updated_key"},
            content_type="application/json",
        )
        request.user = MagicMock(id=1)
        request.user.is_authenticated = True

        mock_instance = MagicMock(pk=1)
        MockGetObjectOr404.return_value = mock_instance

        mock_serializer_instance = MagicMock()
        mock_serializer_instance.is_valid.return_value = True
        mock_serializer_instance.data = {"id": 1, "api_key": "updated_key"}
        MockGetSerializer.return_value = mock_serializer_instance

        # Mock the filter call for get_queryset
        MockBreezeAccountObjects.filter.return_value = MagicMock(
            exists=MagicMock(return_value=True),
            get=MagicMock(return_value=mock_instance),
        )

        response = self.view_update(request, pk=1)
        response.render()
        response_data = json.loads(response.content)

        assert response.status_code == status.HTTP_200_OK
        assert response_data["msg"] == "Account updated successfully"
        assert response_data["data"] == {"id": 1, "api_key": "updated_key"}
        MockGetObjectOr404.assert_called_once()
        mock_serializer_instance.is_valid.assert_called_once_with()
        mock_serializer_instance.save.assert_called_once_with()
        MockBreezeSessionManager.clear_session.assert_called_once_with(request.user.id)
        MockManualStartWebsocket.apply_async.assert_called_once_with(
            args=[request.user.id]
        )

    @patch(
        "apps.core.views.BreezeAccount.objects"
    )  # Patch BreezeAccount.objects directly
    @patch("apps.core.views.get_object_or_404")
    @patch("apps.core.views.BreezeAccountViewSet.get_serializer")
    @patch("apps.core.views.breeze_session_manager")
    @patch("apps.core.views.BreezeAccountViewSet.permission_classes", new=[])
    def test_update_breeze_account_no_credential_update(
        self,
        MockBreezeSessionManager,
        MockGetSerializer,
        MockGetObjectOr404,
        MockBreezeAccountObjects,
    ):
        request = self.factory.patch(
            "/breeze_accounts/1/",
            {"some_other_field": "value"},
            content_type="application/json",
        )
        request.user = MagicMock(id=1)
        request.user.is_authenticated = True

        mock_instance = MagicMock(pk=1)
        MockGetObjectOr404.return_value = mock_instance

        mock_serializer_instance = MagicMock()
        mock_serializer_instance.is_valid.return_value = True
        mock_serializer_instance.data = {"id": 1, "some_other_field": "value"}
        MockGetSerializer.return_value = mock_serializer_instance

        # Mock the filter call for get_queryset
        MockBreezeAccountObjects.filter.return_value = MagicMock(
            exists=MagicMock(return_value=True),
            get=MagicMock(return_value=mock_instance),
        )

        response = self.view_update(request, pk=1)
        response.render()
        response_data = json.loads(response.content)

        assert response.status_code == status.HTTP_200_OK
        assert response_data["msg"] == "Account updated successfully"
        assert response_data["data"] == {"id": 1, "some_other_field": "value"}
        MockGetObjectOr404.assert_called_once()
        mock_serializer_instance.is_valid.assert_called_once_with()
        mock_serializer_instance.save.assert_called_once_with()

    @patch(
        "apps.core.views.BreezeAccount.objects"
    )  # Patch BreezeAccount.objects directly
    @patch("apps.core.views.breeze_session_manager")
    @patch("apps.core.views.cache")
    @patch("apps.core.views.BreezeAccountViewSet.permission_classes", new=[])
    def test_get_breeze_status_success(
        self, MockCache, MockBreezeSessionManager, MockBreezeAccountObjects
    ):
        request = self.factory.get("/breeze_accounts/breeze_status/")
        request.user = MagicMock(id=1)
        request.user.is_authenticated = True

        # Mock the filter call for get_queryset
        MockBreezeAccountObjects.filter.return_value = MagicMock(
            exists=MagicMock(return_value=True)
        )

        mock_session = MagicMock()
        mock_session.get_funds.return_value = {"Status": 200}
        MockBreezeSessionManager.initialize_session.return_value = mock_session

        MockCache.get.return_value = True  # Simulate ticks received

        response = self.view_breeze_status(request)
        response.render()
        response_data = json.loads(response.content)

        assert response.status_code == status.HTTP_200_OK
        assert response_data["msg"] == "done"
        assert response_data["data"] == {
            "session_status": True,
            "websocket_status": True,
        }
        MockBreezeSessionManager.initialize_session.assert_called_once_with(
            request.user.id
        )
        mock_session.get_funds.assert_called_once_with()
        MockCache.get.assert_called_once_with("ticks_received", False)

    @patch("apps.core.views.websocket_start")
    @patch("apps.core.views.BreezeAccountViewSet.permission_classes", new=[])
    def test_start_websocket_success(self, MockWebsocketStart):
        request = self.factory.post("/breeze_accounts/websocket_start/")
        request.user = MagicMock(id=1)
        request.user.is_authenticated = True

        response = self.view_start_websocket(request)
        response.render()
        response_data = json.loads(response.content)

        assert response.status_code == status.HTTP_201_CREATED
        assert response_data["msg"] == "WebSocket Started successfully"
        assert response_data["data"] == "WebSocket Started"
        MockWebsocketStart.apply_async.assert_called_once_with(args=[request.user.id])

    @patch(
        "apps.core.views.BreezeAccount.objects"
    )  # Patch BreezeAccount.objects directly
    @patch("apps.core.views.breeze_session_manager")
    @patch("apps.core.views.BreezeAccountViewSet.permission_classes", new=[])
    @patch(
        "apps.core.views.BreezeAccount.DoesNotExist"
    )  # Patch the actual exception class
    def test_refresh_session_success(
        self, MockDoesNotExist, MockBreezeSessionManager, MockBreezeAccountObjects
    ):
        request = self.factory.post("/breeze_accounts/refresh_session/")
        request.user = MagicMock(id=1)
        request.user.is_authenticated = True

        # Mock the filter call for get_queryset
        MockBreezeAccountObjects.filter.return_value = MagicMock(
            exists=MagicMock(return_value=True)
        )

        mock_session = MagicMock()
        mock_session.get_funds.return_value = {"Status": 200}
        MockBreezeSessionManager.refresh_session.return_value = mock_session

        response = self.view_refresh_session(request)
        response.render()
        response_data = json.loads(response.content)

        assert response.status_code == status.HTTP_200_OK
        assert response_data["msg"] == "Session refreshed successfully"
        assert response_data["data"] == {"session_status": True}
        MockBreezeSessionManager.refresh_session.assert_called_once_with(
            request.user.id
        )
        mock_session.get_funds.assert_called_once_with()

    @patch(
        "apps.core.views.BreezeAccount.objects"
    )  # Patch BreezeAccount.objects directly
    @patch("apps.core.views.breeze_session_manager")
    @patch("apps.core.views.BreezeAccountViewSet.permission_classes", new=[])
    @patch(
        "apps.core.views.BreezeAccount.DoesNotExist"
    )  # Patch the actual exception class
    @pytest.mark.django_db
    def test_refresh_session_failed(
        self, MockDoesNotExist, MockBreezeSessionManager, MockBreezeAccountObjects
    ):
        request = self.factory.post("/breeze_accounts/refresh_session/")
        request.user = MagicMock(id=1)
        request.user.is_authenticated = True

        # Mock the filter call for get_queryset
        MockBreezeAccountObjects.filter.return_value = MagicMock(
            exists=MagicMock(return_value=True)
        )

        mock_session = MagicMock()
        mock_session.get_funds.return_value = {
            "Status": 400
        }  # Simulate failed get_funds
        MockBreezeSessionManager.refresh_session.return_value = mock_session

        response = self.view_refresh_session(request)
        response.render()
        response_data = json.loads(response.content)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response_data["msg"] == "Session refresh failed"
        assert response_data["data"] == {"session_status": False}
        MockBreezeSessionManager.refresh_session.assert_called_once_with(
            request.user.id
        )
        mock_session.get_funds.assert_called_once_with()
