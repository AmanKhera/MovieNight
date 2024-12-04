from django.shortcuts import render
from user_login.utils import get_cognito_client
from django.http import JsonResponse
from movie.models import Watchlist
from user.models import User
import jwt


#Get User Username method
#Grabs users username using the access token given from cognito
#Returns: Python Dictionary containing username
def get_user_username(access_token):

    if not access_token:
        return JsonResponse({"error": "Access token not found in session"}, status=401)

    try:
        #Decode the token without verifying the signature
        decoded_token = jwt.decode(access_token, options={"verify_signature": False})
        
        #Extract the username from the decoded token
        username = decoded_token.get("username")
        if not username:
            return JsonResponse({"error": "Username not found in token"}, status=400)

        #Return the username in python dictionary
        return {"username": username}

    except jwt.DecodeError:
        return JsonResponse({"error": "Failed to decode token"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    





def create_watchlist(request):

    if request.method in ['POST', 'GET']:
        username = get_user_username(request.session.get("access_token")).get('username')
        id = (User.objects.get(name=username)).id

        name = request.GET.get('name', 'Watchlist') 

        watchlist_type = Watchlist.MAIN
        if name != "Watchlist":
            watchlist_type = Watchlist.CUSTOM


        #watchlist_type = request.POST.get('type', Watchlist.MAIN)

        #Validate the watchlist_type
        if watchlist_type not in [choice[0] for choice in Watchlist.WATCHLIST_TYPE_CHOICES]:
            return JsonResponse({'success': False, 'message': 'Invalid watchlist type provided.'}, status=400)

        #Check for an existing main watchlist
        if watchlist_type == Watchlist.MAIN and Watchlist.objects.filter(user_id=id, type=Watchlist.MAIN).exists():
            return JsonResponse({'success': False, 'message': 'A main watchlist already exists for this user.'}, status=400)

        if Watchlist.objects.filter(user_id=id, name=name).exists():
            return JsonResponse({'success': False, 'message': 'A watchlist with this name already exists for the user.'}, status=400)


        try:
            #Create the watchlist
            watchlist = Watchlist.objects.create(user_id=id, name=name, type=watchlist_type)
            return JsonResponse({'success': True, 'message': 'Watchlist created successfully.', 'data': {
                'user_id': id,
                'name': watchlist.name,
                'type': watchlist_type,
            }})
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'An error occurred: {str(e)}'}, status=500)

    return JsonResponse({'success': False, 'message': 'Invalid request method.'}, status=405)

    

