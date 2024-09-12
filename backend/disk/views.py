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

YANDEX_DISK_API_URL = 'https://cloud-api.yandex.net/v1/disk/public/resources'


@swagger_auto_schema(
    method='post',
    request_body=UserRegisterSerializer,
    operation_description="Register a new user"
)
@api_view(['POST'])
def register(request):
    data = request.data
    email = data.get('email')
    username = data.get('username')
    password = data.get('password')

    if not email or not username or not password:
        return Response({'errors': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'errors': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email=email).exists():
        return Response({'errors': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, email=email, password=password)

    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

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
def login_user(request):
    data = request.data
    username = data.get('username')
    password = data.get('password')

    user = authenticate(username=username, password=password)
    if user is not None:
        login(request, user)

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

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


@csrf_exempt
@swagger_auto_schema(
    method='post',
    operation_description="Logout a user"
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    logout(request)
    response = JsonResponse({'message': 'Logout successful'})
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
def get_files(request):
    public_url = request.GET.get('public_url')
    if not public_url:
        return Response({'error': 'Public URL is required'}, status=400)

    try:
        response = requests.get(f'{YANDEX_DISK_API_URL}?public_key={public_url}')
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        return Response({'error': f'Unable to fetch files: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    data = response.json()

    # Check if it is a directory or a file
    if 'file' in data:
        # If it is a file, add it to the list as a single item
        files = [{
            'name': data.get('name'),
            'type': 'file',
            'path': data.get('file')
        }]
    else:
        # If it is a directory, get all the files inside it
        items = data.get('_embedded', {}).get('items', [])
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
def download_file(request):
    download_link = request.GET.get('download_url')
    if not download_link:
        return Response({'error': 'Download link not found'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Redirect the user to download the file using the provided link
        return Response({'redirect_url': download_link}, status=200)
    except requests.exceptions.RequestException as e:
        return Response({'error': f'Failed to download file: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
