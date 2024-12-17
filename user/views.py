from django.shortcuts import render
from user_login.utils import get_cognito_client
from django.http import JsonResponse
from movie.models import Watchlist
from user.models import User
from movie.models import Watchlist, WatchlistItem
from user.models import User
from django.shortcuts import get_object_or_404
from movie.models import Watchlist, WatchlistItem
import json
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


def add_movie(request):

    if request.method != 'GET':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    try:
        movie_id = request.GET.get('movie_id') #grabs movie id from query
        watchlist_name = request.GET.get('watchlist_name', 'Watchlist')  # Default watchlist is Watchlist'

        username = get_user_username(request.session.get("access_token")).get('username')
        id = (User.objects.get(name=username)).id #needed to grab users watchlists

        #Grabs the watchlist needed to create foriegn key
        watchlist = Watchlist.objects.get(user_id=id, name=watchlist_name) 


        if not movie_id:
            return JsonResponse({'error': 'Movie ID is required'}, status=400)


        # Check if the movie is already in the watchlist
        if WatchlistItem.objects.filter(watchlist=watchlist, movie_id=movie_id).exists():
            return JsonResponse({'message': 'Movie is already in the watchlist'}, status=200)

        # Add the movie to the watchlist
        WatchlistItem.objects.create(watchlist=watchlist, movie_id=movie_id)

        return JsonResponse({'message': 'Movie added to watchlist successfully'})

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON input'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    

