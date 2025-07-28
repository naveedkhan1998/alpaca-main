import os

from django.core.mail import EmailMessage, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags


class Util:
    @staticmethod
    def send_email(data):
        email = EmailMessage(
            subject=data["subject"],
            body=data["body"],
            from_email=os.environ.get("EMAIL_FROM", "dtemplarsarsh@gmail.com"),
            to=[data["to_email"]],
        )
        email.send()

    @staticmethod
    def send_html_email(subject, to, path_to_html, value):
        html_content = render_to_string(path_to_html, {"otp": value})
        text_content = strip_tags(html_content)
        from_email = os.environ.get("EMAIL_FROM", "dtemplarsarsh@gmail.com")
        email = EmailMultiAlternatives(subject, text_content, from_email, [to])
        email.attach_alternative(html_content, "text/html")
        email.send()
