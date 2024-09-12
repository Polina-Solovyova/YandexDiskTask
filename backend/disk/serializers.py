from django.contrib.auth.models import User
from rest_framework import serializers


class FileSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    path = serializers.CharField(max_length=255)
    mime_type = serializers.CharField(max_length=100)
    size = serializers.IntegerField()


class UserRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'password', 'email']


class UserLoginSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'password']