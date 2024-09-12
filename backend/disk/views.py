from YandexDiskTask.backend.disk.serializers import UserRegisterSerializer, UserLoginSerializer
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth import authenticate, login, logout
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from django.views.decorators.csrf import csrf_exempt
from drf_yasg.utils import swagger_auto_schema
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.http import JsonResponse
from rest_framework import status
from drf_yasg import openapi
import requests
from typing import Dict, Any, List, Union, Optional

# URL для доступа к API Яндекс.Диска
YANDEX_DISK_API_URL = 'https://cloud-api.yandex.net/v1/disk/public/resources'


@swagger_auto_schema(
    method='post',
    request_body=UserRegisterSerializer,
    operation_description="Register a new user"
)
@api_view(['POST'])
def register(request) -> Response:
    """
    Регистрация нового пользователя.

    Args:
        request: Объект запроса, содержащий данные пользователя (email, username, password).

    Returns:
        Response: Возвращает сообщение о результате регистрации, JWT токены и данные пользователя.
    """
    data: Dict[str, Any] = request.data
    email: Optional[str] = data.get('email')
    username: Optional[str] = data.get('username')
    password: Optional[str] = data.get('password')

    if not email or not username or not password:
        return Response({'errors': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'errors': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email=email).exists():
        return Response({'errors': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)

    user: User = User.objects.create_user(username=username, email=email, password=password)

    refresh: RefreshToken = RefreshToken.for_user(user)
    access_token: str = str(refresh.access_token)
    refresh_token: str = str(refresh)

    return Response({
        'message': 'Register successful',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'email': user.email,
            'id': user.id,
            'username': user.username,
        }
    }, status=status.HTTP_200_OK)


@swagger_auto_schema(
    method='post',
    request_body=UserLoginSerializer,
    operation_description="Login a user"
)
@api_view(['POST'])
def login_user(request) -> Response:
    """
    Авторизация пользователя.

    Args:
        request: Объект запроса, содержащий данные для входа (username, password).

    Returns:
        Response: Возвращает JWT токены и данные пользователя.
    """
    data: Dict[str, Any] = request.data
    username: Optional[str] = data.get('username')
    password: Optional[str] = data.get('password')

    user: Optional[User] = authenticate(username=username, password=password)
    if user is not None:
        login(request, user)

        refresh: RefreshToken = RefreshToken.for_user(user)
        access_token: str = str(refresh.access_token)
        refresh_token: str = str(refresh)

        return Response({
            'message': 'Login successful',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'email': user.email,
                'id': user.id,
                'username': user.username,
            }
        }, status=status.HTTP_200_OK)
    else:
        return Response({'errors': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@csrf_exempt
@swagger_auto_schema(
    method='post',
    operation_description="Logout a user"
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request) -> JsonResponse:
    """
    Выход пользователя из системы.

    Args:
        request: Объект запроса.

    Returns:
        JsonResponse: Сообщение о выходе и удалении токенов из cookies.
    """
    logout(request)
    response: JsonResponse = JsonResponse({'message': 'Logout successful'})
    response.delete_cookie('access_token')
    response.delete_cookie('refresh_token')
    return response


@swagger_auto_schema(
    method='get',
    operation_description="Получить список файлов по публичной ссылке",
    manual_parameters=[
        openapi.Parameter(
            'public_url', openapi.IN_QUERY, description="Публичная ссылка на файлы", type=openapi.TYPE_STRING
        )
    ],
    responses={
        200: openapi.Response(
            description="Список файлов",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'files': openapi.Schema(
                        type=openapi.TYPE_ARRAY,
                        items=openapi.Schema(type=openapi.TYPE_OBJECT),
                    )
                }
            ),
        ),
        400: openapi.Response(
            description="Ошибка: Публичная ссылка не передана"
        )
    }
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_files(request) -> Response:
    """
    Получить список файлов по публичной ссылке Яндекс.Диска.

    Args:
        request: Объект запроса, содержащий публичную ссылку (public_url).

    Returns:
        Response: Возвращает список файлов или сообщение об ошибке.
    """
    public_url: Optional[str] = request.GET.get('public_url')
    if not public_url:
        return Response({'error': 'Public URL is required'}, status=400)

    try:
        response: requests.Response = requests.get(f'{YANDEX_DISK_API_URL}?public_key={public_url}')
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        return Response({'error': f'Unable to fetch files: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    data: Dict[str, Any] = response.json()

    if 'file' in data:
        files: List[Dict[str, Any]] = [{
            'name': data.get('name'),
            'type': 'file',
            'path': data.get('file')
        }]
    else:
        items: List[Dict[str, Any]] = data.get('_embedded', {}).get('items', [])
        files = [{'name': item.get('name'), 'type': item.get('type'), 'path': item.get('file')} for item in items]

    return Response({'files': files}, status=200)


@swagger_auto_schema(
    method='get',
    operation_description="Скачать файл по публичной ссылке",
    manual_parameters=[
        openapi.Parameter(
            'download_url', openapi.IN_QUERY, description="Публичная ссылка на файл для скачивания", type=openapi.TYPE_STRING
        )
    ],
    responses={
        200: openapi.Response(
            description="Файл для скачивания",
            content={
                'application/octet-stream': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    format=openapi.FORMAT_BINARY
                )
            }
        ),
        400: openapi.Response(
            description="Ошибка: Ссылка на скачивание не передана"
        )
    }
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_file(request) -> Response:
    """
    Скачать файл по публичной ссылке.

    Args:
        request: Объект запроса, содержащий ссылку на скачивание (download_url).

    Returns:
        Response: Возвращает URL для скачивания или сообщение об ошибке.
    """
    download_link: Optional[str] = request.GET.get('download_url')
    if not download_link:
        return Response({'error': 'Download link not found'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        return Response({'redirect_url': download_link}, status=200)
    except requests.exceptions.RequestException as e:
        return Response({'error': f'Failed to download file: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
