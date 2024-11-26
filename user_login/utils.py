import boto3
from django.conf import settings

#grabs cognito client via boto3 used to interact with cognito
#signs up new users, handle login and token exchanges, refresh token authentication
def get_cognito_client():
    return boto3.client("cognito-idp", region_name=settings.AWS_COGNITO_REGION)