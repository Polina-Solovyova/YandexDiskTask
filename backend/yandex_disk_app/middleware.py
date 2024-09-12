from django.shortcuts import redirect
from django.urls import reverse


class RedirectToRegistrationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path == '/' and not request.user.is_authenticated:
            return redirect(reverse('register'))
        response = self.get_response(request)
        return response
