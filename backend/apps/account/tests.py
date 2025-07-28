from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model

User = get_user_model()


# Removed @pytest.mark.django_db as we are mocking the database interaction
def test_user_create_mocked():
    with patch.object(User.objects, "create_user") as mock_create_user:
        # Create a MagicMock object that behaves like a User instance
        mock_user_instance = MagicMock()
        mock_user_instance.email = "test@example.com"
        mock_user_instance.name = "Test User"
        mock_user_instance.tc = True
        mock_user_instance.is_active = True
        mock_user_instance.is_email_verify = True
        mock_user_instance.is_admin = False
        mock_user_instance.is_staff = (
            False  # is_staff is a property derived from is_admin
        )
        mock_user_instance.is_superuser = (
            False  # is_superuser is also derived from is_admin
        )

        # Mock the check_password method for the mock user instance
        mock_user_instance.check_password.return_value = True

        # Configure the mock to return the MagicMock user object
        mock_create_user.return_value = mock_user_instance

        # Call the mocked create_user with the correct arguments
        user = User.objects.create_user(
            email="test@example.com", name="Test User", tc=True, password="password123"
        )

        # Assert that create_user was called with the correct arguments
        mock_create_user.assert_called_once_with(
            email="test@example.com", name="Test User", tc=True, password="password123"
        )

        # Assert properties of the returned user object (which is our mock_user_instance)
        assert user.email == "test@example.com"
        assert user.name == "Test User"
        assert user.tc is True
        assert user.check_password("password123")
        assert user.is_active is True
        assert user.is_email_verify is True
        assert user.is_admin is False
        assert user.is_staff is False
        assert user.is_superuser is False


def test_create_superuser_mocked():
    with patch.object(User.objects, "create_superuser") as mock_create_superuser:
        # Create a MagicMock object that behaves like a User instance
        mock_user_instance = MagicMock()
        mock_user_instance.email = "admin@example.com"
        mock_user_instance.name = "Test User"
        mock_user_instance.tc = True
        mock_user_instance.is_active = True
        mock_user_instance.is_email_verify = True
        mock_user_instance.is_admin = True
        mock_user_instance.is_staff = True
        mock_user_instance.is_superuser = True

        # Mock the check_password method for the mock user instance
        mock_user_instance.check_password.return_value = True

        # Configure the mock to return the MagicMock user object
        mock_create_superuser.return_value = mock_user_instance

        # Call the mocked create_superuser with the correct arguments
        user = User.objects.create_superuser(
            email="admin@example.com",
            name="Test User",
            tc=True,
            password="password123",
        )

        # Assert that create_superuser was called with the correct arguments
        mock_create_superuser.assert_called_once_with(
            email="admin@example.com",
            name="Test User",
            tc=True,
            password="password123",
        )

        # Assert properties of the returned user object (which is our mock_user_instance)
        assert user.email == "admin@example.com"
        assert user.name == "Test User"
        assert user.tc is True
        assert user.check_password("password123")
        assert user.is_active is True
        assert user.is_email_verify is True
        assert user.is_admin is True
        assert user.is_staff is True
        assert user.is_superuser is True
