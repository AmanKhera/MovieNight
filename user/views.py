from django.shortcuts import render
from user_login.utils import get_cognito_client
from django.http import JsonResponse
import jwt


#Get User Username method
#Grabs users username using the access token given from cognito
def get_user_username(request):

    access_token = request.session.get("access_token")
    if not access_token:
        return JsonResponse({"error": "Access token not found in session"}, status=401)

    try:
        # Decode the token without verifying the signature
        decoded_token = jwt.decode(access_token, options={"verify_signature": False})
        
        # Extract the username from the decoded token
        username = decoded_token.get("username")
        if not username:
            return JsonResponse({"error": "Username not found in token"}, status=400)

        # Return the username in a JSON response
        return JsonResponse({"username": username}, status=200)

    except jwt.DecodeError:
        return JsonResponse({"error": "Failed to decode token"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

    
