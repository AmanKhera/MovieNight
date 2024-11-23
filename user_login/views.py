from django.shortcuts import render
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .utils import get_cognito_client
from django.shortcuts import redirect
from django.conf import settings
import requests

#Sign up Method
#If we create out own login page we can pass the sign-up params and cognito will sign up the user
@csrf_exempt
def sign_up(request):
    if request.method == "POST":
        data = json.loads(request.body)
        email = data.get("email")
        password = data.get("password")
        username = data.get("Username")

        if not email or not password:
            return JsonResponse({"error": "Email and password are required"}, status=400)
        
        client = get_cognito_client()

        try:
            response = client.sign_up(
                ClientId=settings.AWS_COGNITO_CLIENT_ID,
                Username=email,
                Password=password,
                UserAttributes=[
                    {"Name": "email", "Value": email},
                    {"Name": "custom:Username", "Value": username}, 
                ],
            )
            return JsonResponse({"message": "User signed up successfully"}, status=201)

        except client.exceptions.UsernameExistsException:
            return JsonResponse({"error": "User already exists"}, status=400)
        except client.exceptions.InvalidParameterException as e:
            return JsonResponse({"error": f"Invalid parameter: {str(e)}"}, status=400)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Invalid HTTP method"}, status=405) 


#Login Method
#Used if we create our own login page, we pass the login info to cognito
@csrf_exempt
def login(request):
    if request.method == "POST":
        data = json.load(request.body)
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return JsonResponse({"error": "Email and password are required"}, status=400)
        
        client = get_cognito_client()

        try:
            response = client.initiate_auth(
                ClientId = settings.AWS_COGNITO_CLIENT_ID,
                AuthFlow = "USER_PASSWORD_AUTH",
                AuthParameters={
                    "USERNAME": email,
                    "PASSWORD": password,
                },
            )
            tokens = response.get("AuthenticationResult", {})
            return JsonResponse({"message": "Login successful", "tokens": tokens}, status=200)
        
        except client.exceptions.NotAuthorizedException:
            return JsonResponse({"error": "Invalid email or password"}, status=401)
        except client.exceptions.UserNotConfirmedException:
            return JsonResponse({"error": "User is not confirmed"}, status=400)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)   

    return JsonResponse({"error": "Invalid HTTP method"}, status=405) 



#hosted_iu_login
#   When user clicks on login page it sends them to aws cognito and then to 
#   http://localhost:8000/hosted-login
#   at which point if the user logs in we go to the login_callback Method
def hosted_ui_login(request):
    cognito_url = (
        f"https://{settings.AWS_COGNITO_DOMAIN}/login?"
        f"client_id={settings.AWS_COGNITO_CLIENT_ID}&"
        f"response_type=code&"
        f"scope=email+openid+phone&"
        f"redirect_uri=http://localhost:8000/Login"
    )
    return redirect(cognito_url)


#login_callback
#   Provides 2 tokens:
#       ID Token: Can be used to retrieve personal information such as username or email
#       Access Token: More secure than an id token and is updated on the spot, same features as id token
#       but more secure and what we will be using
#   Tokens can be retrieved via request.session["token_name"]
def login_callback(request):
    code = request.GET.get('code')

    if not code:
        return JsonResponse({"error": "Authorization code not provided"}, status=400)
    
    token_url = f"https://{settings.AWS_COGNITO_DOMAIN}/oauth2/token"
    redirect_uri = "http://localhost:8000/Login"

    try:
        response = requests.post(
            token_url,
            data={
                "grant_type": "authorization_code",
                "client_id": settings.AWS_COGNITO_CLIENT_ID,
                "client_secret": settings.AWS_COGNITO_CLIENT_SECRET,
                "code": code,
                "redirect_uri": redirect_uri,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        if response.status_code != 200:
            return JsonResponse({"error": "Failed to retrieve tokens", "details": response.json()}, status=500)

        tokens = response.json()
        request.session["id_token"] = tokens.get("id_token")
        request.session["access_token"] = tokens.get("access_token")
        request.session["refresh_token"] = tokens.get("refresh_token")

        print(request.session["access_token"])

        return JsonResponse({"message": "Login successful", "tokens": tokens}, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)    