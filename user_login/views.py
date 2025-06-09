from django.shortcuts import render
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .utils import get_cognito_client
from django.shortcuts import redirect
from django.conf import settings
import requests
from botocore.exceptions import BotoCoreError, ClientError
from user.models import User
from user.views import get_user_username, create_watchlist
import jwt
from django.shortcuts import redirect


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
        f"scope=email+openid+phone+aws.cognito.signin.user.admin&"  #required scopes
        f"redirect_uri=http://localhost:8000/Login"
    )
    return redirect(cognito_url)


#login_callback
#   Provides 2 tokens:
#       ID Token: Can be used to retrieve personal information such as username or email
#       Access Token: More secure than an id token and is updated on the spot, same features as id token
#       but more secure and what we will be using
#   Tokens can be retrieved via request.session["token_name"]
# def login_callback(request):
#     code = request.GET.get('code')

#     if not code:
#         return JsonResponse({"error": "Authorization code not provided"}, status=400)

#     token_url = f"https://{settings.AWS_COGNITO_DOMAIN}/oauth2/token"
#     redirect_uri = "http://localhost:8000/Login"

#     try:
#         #Exchange the authorization code for tokens
#         response = requests.post(
#             token_url,
#             data={
#                 "grant_type": "authorization_code",
#                 "client_id": settings.AWS_COGNITO_CLIENT_ID,
#                 "client_secret": settings.AWS_COGNITO_CLIENT_SECRET,
#                 "code": code,
#                 "redirect_uri": redirect_uri,
#             },
#             headers={"Content-Type": "application/x-www-form-urlencoded"},
#         )

#         if response.status_code != 200:
#             return JsonResponse({"error": "Failed to retrieve tokens", "details": response.json()}, status=500)

#         tokens = response.json()
#         request.session["id_token"] = tokens.get("id_token")
#         request.session["access_token"] = tokens.get("access_token")
#         request.session["refresh_token"] = tokens.get("refresh_token")

#         #Updates table if the user is new
#         result = update_or_create_user_from_cognito(request.session.get("access_token"))

#         if "error" in result:
#             return JsonResponse({"error": result["error"]}, status=500)

#         #Handle existing users without creating new ones
#         if "message" in result and result["message"] == "User already exists, no update or creation needed.":
#             is_new_user = False
#         else:
#             user = result["user"]
#             is_new_user = result["is_new"]

#             #If the user is new, create a default Watchlist
#             if is_new_user:
#                 create_watchlist(request)


       
#         return JsonResponse({
#             "message": "Sign up successful" if is_new_user else "Login successful",
#             "is_new": is_new_user,
#             "tokens": tokens
#         }, status=200)

#     except Exception as e:
#         return JsonResponse({"error": str(e)}, status=500) 
    



#Login Callback
#Desc: Handles OAuth2 login callback from AWS Cognito. Exchanges authorization code for ID, access, and refresh tokens.
#Tokens are stored in the session and if the user is new we create a default watchlist for them
#Returns: Success: redirects user to frontend
def login_callback(request):
    code = request.GET.get('code')
    if not code:
        return JsonResponse({"error": "Authorization code not provided"}, status=400)

    token_url = f"https://{settings.AWS_COGNITO_DOMAIN}/oauth2/token"
    redirect_uri = "http://localhost:8000/Login"

    try:
        #Exchanges the authorization code for tokens
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
        response.raise_for_status()
        tokens = response.json()

        #Save tokens in session
        request.session["id_token"] = tokens["id_token"]
        request.session["access_token"] = tokens["access_token"]
        request.session["refresh_token"] = tokens["refresh_token"]

        #Update or create the user
        result = update_or_create_user_from_cognito(tokens["access_token"])
        if "error" in result:
            return JsonResponse({"error": result["error"]}, status=500)

        is_new_user = False
        if result.get("message") == "User already exists, no update or creation needed.":
            is_new_user = False
        else:
            is_new_user = result.get("is_new", False)
            if is_new_user:
                create_watchlist(request)


        return redirect(f"http://localhost:3000/?new_user={str(is_new_user).lower()}")

    except requests.HTTPError as e:
        return JsonResponse({"error": "Failed to retrieve tokens", "details": response.json()}, status=500)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)



#Update or create user from cognito
#Desc: Checks to see if user exists within our User table
#Params: access_token: Given via login_callback to get all the necessary information to populate our table
#Return: User, and is_new
def update_or_create_user_from_cognito(access_token):
    
    try:

        username = get_user_username(access_token).get('username')

        if User.objects.filter(name=username).exists():
             return {"user": username, "is_new": False}
        

        #Decode given access token to grab user attributes
        decoded_token = jwt.decode(access_token, options={"verify_signature": False})

        #Use AWS Cognito client to fetch user attributes
        client = get_cognito_client()
        response = client.get_user(AccessToken=access_token)

        #Parse attributes given via response
        user_attributes = {attr['Name']: attr['Value'] for attr in response['UserAttributes']}
        email = user_attributes.get('email')

        if not email:
            return {"error": "Email is required to update or create a user."}

        user, created = User.objects.update_or_create(
            email=email,
            name = username
        )

        #Returns user and whether they are new
        return {"user": user, "is_new": created}

    except jwt.ExpiredSignatureError:
        return {"error": "The access token has expired."}
    except jwt.DecodeError:
        return {"error": "The access token is invalid."}
    except Exception as e:
        return {"error": f"An unexpected error occurred: {str(e)}"}
    



