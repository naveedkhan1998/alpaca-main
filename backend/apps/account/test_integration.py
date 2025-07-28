from django.contrib.auth import get_user_model
from django.db.utils import IntegrityError
import pytest

User = get_user_model()


@pytest.mark.django_db
def test_create_user():
    user = User.objects.create_user(
        email="test@example.com", name="Test User", tc=True, password="password123"
    )
    assert user.email == "test@example.com"
    assert user.name == "Test User"
    assert user.tc is True
    assert user.check_password("password123")
    assert user.is_active is True
    assert user.is_email_verify is False
    assert user.is_admin is False
    assert user.is_staff is False
    assert user.is_superuser is False


@pytest.mark.django_db
def test_create_user_no_email():
    with pytest.raises(ValueError, match="Users must have an email address"):
        User.objects.create_user(
            email=None, name="Test User", tc=True, password="password123"
        )


@pytest.mark.django_db
def test_create_user_no_name():
    with pytest.raises(ValueError, match="The Name field is required."):
        User.objects.create_user(
            email="test@example.com", name=None, tc=True, password="password123"
        )


@pytest.mark.django_db
def test_create_user_duplicate_email():
    User.objects.create_user(
        email="test@example.com", name="Test User", tc=True, password="password123"
    )
    with pytest.raises(IntegrityError):
        User.objects.create_user(
            email="test@example.com",
            name="Another User",
            tc=True,
            password="password456",
        )


@pytest.mark.django_db
def test_create_superuser():
    superuser = User.objects.create_superuser(
        email="admin@example.com", name="Admin User", password="password123"
    )
    assert superuser.email == "admin@example.com"
    assert superuser.name == "Admin User"
    assert superuser.tc is True
    assert superuser.check_password("password123")
    assert superuser.is_active is True
    assert superuser.is_email_verify is True
    assert superuser.is_admin is True
    assert superuser.is_staff is True
    assert superuser.is_superuser is True


@pytest.mark.django_db
def test_create_superuser_no_password():
    with pytest.raises(ValueError, match="Superusers must have a password."):
        User.objects.create_superuser(
            email="admin@example.com", name="Admin User", password=None
        )


@pytest.mark.django_db
def test_user_str_method():
    user = User.objects.create_user(
        email="test@example.com", name="Test User", password="password123"
    )
    assert str(user) == "test@example.com (Test User)"


@pytest.mark.django_db
def test_user_has_perm():
    user = User.objects.create_user(
        email="test@example.com", name="Test User", password="password123"
    )
    assert user.has_perm("some_perm") is False

    superuser = User.objects.create_superuser(
        email="admin@example.com", name="Admin User", password="password123"
    )
    assert superuser.has_perm("some_perm") is True


@pytest.mark.django_db
def test_user_has_module_perms():
    user = User.objects.create_user(
        email="test@example.com", name="Test User", password="password123"
    )
    assert user.has_module_perms("some_app") is True
