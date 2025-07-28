from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    GoogleLoginView,
    SendPasswordResetEmailView,
    UserChangePassword,
    UserChangePasswordView,
    UserListView,
    UserLoginView,
    UserPasswordResetView,
    UserProfileView,
    UserRegistrationView,
)

urlpatterns = [
    path("register/", UserRegistrationView.as_view(), name="register"),
    path("login/", UserLoginView.as_view(), name="login"),
    path("refresh_token/", TokenRefreshView.as_view(), name="refresh_token"),
    path("users/", UserListView.as_view(), name="user-list"),
    path("profile/", UserProfileView.as_view(), name="profile"),
    path("change-password/", UserChangePasswordView.as_view(), name="change_password"),
    path(
        "changepassword/", UserChangePassword.as_view(), name="change_password_old"
    ),  # Backward compatibility
    path(
        "reset-password/", SendPasswordResetEmailView.as_view(), name="reset_password"
    ),
    path(
        "send-reset-password-email/",
        SendPasswordResetEmailView.as_view(),
        name="send-reset-password-email",
    ),  # Backward compatibility
    path(
        "reset-password/<uid>/<token>/",
        UserPasswordResetView.as_view(),
        name="password_reset_confirm",
    ),
    path("social/google/", GoogleLoginView.as_view(), name="google_login"),
]

# www.abc.com/account/login/
