from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_bytes, smart_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.account.utils import Util
from main import const
from main.settings.local import BASE_DIR

from .models import User


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=False, style={"input_type": "password"}
    )
    password2 = serializers.CharField(
        write_only=True, required=False, style={"input_type": "password"}
    )
    tc = serializers.BooleanField(required=False)
    auth_provider = serializers.CharField(
        write_only=True, required=False, default=const.AUTH_PROVIDERS.get("email")
    )

    class Meta:
        model = User
        fields = ["email", "name", "password", "password2", "tc", "auth_provider"]
        extra_kwargs = {"password": {"write_only": True}}

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")
        password2 = attrs.get("password2")
        tc = attrs.get("tc")
        auth_provider = attrs.get("auth_provider", const.AUTH_PROVIDERS.get("email"))

        if auth_provider == const.AUTH_PROVIDERS.get("email"):
            # Direct email registration
            if not password or not password2:
                raise serializers.ValidationError(
                    _("Password fields are required for email registration.")
                )
            if password != password2:
                raise serializers.ValidationError(_("Passwords don't match."))
            validate_password(password)
            if tc is not True:
                raise serializers.ValidationError(
                    _("You must accept the terms and conditions.")
                )
        else:
            # OAuth registration
            if User.objects.filter(email=email).exists():
                raise serializers.ValidationError(
                    _("User with this email already exists.")
                )
            attrs["tc"] = True  # Assuming terms are accepted via OAuth

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        validated_data.pop("password2", None)
        auth_provider = validated_data.pop(
            "auth_provider", const.AUTH_PROVIDERS.get("email")
        )

        user = User(
            email=validated_data["email"],
            name=validated_data["name"],
            tc=validated_data.get("tc", True),
            auth_provider=auth_provider,
            is_email_verify=auth_provider != const.AUTH_PROVIDERS.get("email"),
        )

        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.save()
        return user


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=255)
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        fields = ["email", "password"]

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        user = authenticate(username=email, password=password)

        if user:
            if not user.is_active:
                raise serializers.ValidationError(_("User account is disabled."))
            attrs["user"] = user
            return attrs
        else:
            if User.objects.filter(email=email).exists():
                user = User.objects.get(email=email)
                if user.auth_provider != const.AUTH_PROVIDERS.get("email"):
                    raise serializers.ValidationError(
                        _(f"Please continue your login using {user.auth_provider}.")
                    )
            raise serializers.ValidationError(_("Invalid email or password."))


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "email", "avatar"]


class UserProfileSerializer(serializers.ModelSerializer):
    @staticmethod
    def get_avatar(obj):
        try:
            return obj.avatar.url
        except (AttributeError, ValueError):
            return None

    avatar = serializers.SerializerMethodField("get_avatar")

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "name",
            "avatar",
            "is_admin",
            "auth_provider",
        ]


class UserChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(
        write_only=True, required=False, style={"input_type": "password"}
    )
    new_password = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )
    new_password2 = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )

    class Meta:
        fields = ["old_password", "new_password", "new_password2"]

    def validate(self, attrs):
        user = self.context.get("user")
        old_password = attrs.get("old_password")
        new_password = attrs.get("new_password")
        new_password2 = attrs.get("new_password2")

        if new_password != new_password2:
            raise serializers.ValidationError(_("New passwords don't match."))

        if user.auth_provider == const.AUTH_PROVIDERS.get("email"):
            # For direct login users
            if not user.check_password(old_password):
                raise serializers.ValidationError(_("Old password is incorrect."))
        else:
            # For OAuth users
            if user.has_usable_password():
                if not user.check_password(old_password):
                    raise serializers.ValidationError(_("Old password is incorrect."))
            elif old_password:
                raise serializers.ValidationError(_("No existing password to verify."))

        validate_password(new_password, user=user)
        return attrs

    def save(self, **kwargs):
        user = self.context.get("user")
        new_password = self.validated_data.get("new_password")
        user.set_password(new_password)
        user.save()
        return user


class SendPasswordResetEmailSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=255)

    class Meta:
        fields = ["email"]

    def validate(self, attrs):
        email = attrs.get("email")
        if not User.objects.filter(email=email).exists():
            raise serializers.ValidationError(
                _("There is no user registered with this email address.")
            )

        user = User.objects.get(email=email)
        if user.auth_provider != const.AUTH_PROVIDERS.get("email"):
            raise serializers.ValidationError(
                _(
                    f"Password reset not allowed for {user.auth_provider} sign-in method."
                )
            )

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = PasswordResetTokenGenerator().make_token(user)
        link = (
            "https://naveedkhan1998.github.io/user-auth-react/#/api/user/reset/"
            + uid
            + "/"
            + token
            + "/"
        )
        subject = "Reset LINK"
        to = user.email
        path_to_html = str(BASE_DIR) + "/home/templates/password_reset.html"
        Util.send_html_email(subject, to, path_to_html, link)
        return attrs


class UserPasswordResetSerializer(serializers.Serializer):
    new_password = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )
    new_password2 = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )

    class Meta:
        fields = ["new_password", "new_password2"]

    def validate(self, attrs):
        uid = self.context.get("uid")
        token = self.context.get("token")
        new_password = attrs.get("new_password")
        new_password2 = attrs.get("new_password2")

        if new_password != new_password2:
            raise serializers.ValidationError(_("Passwords don't match."))

        try:
            user_id = smart_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist) as e:
            raise serializers.ValidationError(_("Invalid user.")) from e

        if user.auth_provider != const.AUTH_PROVIDERS.get("email"):
            raise serializers.ValidationError(
                _(
                    f"Password reset not allowed for {user.auth_provider} sign-in method."
                )
            )

        if not PasswordResetTokenGenerator().check_token(user, token):
            raise serializers.ValidationError(_("Invalid or expired token."))

        validate_password(new_password, user=user)
        attrs["user"] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        new_password = self.validated_data.get("new_password")
        user.set_password(new_password)
        user.save()
        return user
