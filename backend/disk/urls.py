from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    # User authentication and registration
    path('register/', views.register, name='register'),
    path('login/', views.login_user, name='login'),
    path('logout/', views.logout_user, name='logout'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('files/', views.get_files, name='get_files'),
    path('download/', views.download_file, name='download_file'),
]
