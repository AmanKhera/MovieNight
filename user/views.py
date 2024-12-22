from django.shortcuts import render
from user_login.utils import get_cognito_client
from django.http import JsonResponse
from movie.models import Watchlist
from user.models import User, Relationship
from movie.models import Watchlist, WatchlistItem
from django.shortcuts import get_object_or_404
from django.db.models import Q
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



#Add_Movie Watchlist
#Adds movie to default watchlist or watchlist specified 
#Params in URL: movie_id 
#Optional Param: watchlist_name
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
    

#Create_relationship method
#Requires 2 params in url, creates relationship in database
#For a pair to be friends this url must be called twice, the second time the ids must be flipped
#Example URL
#http://127.0.0.1:8000/create_relationship/?follower_id=1&following_id=2
def create_relationship(request):
    
    follower_id = request.GET.get('follower_id')
    following_id = request.GET.get('following_id')

    if not follower_id or not following_id:
        return JsonResponse({"error": "follower_id and following_id are required"}, status=400)

    if follower_id == following_id:
        return JsonResponse({"error": "A user cannot follow themselves"}, status=400)    


    try:
        #grab user instances from table needed for foreign key
        follower = User.objects.get(id = follower_id)
        following = User.objects.get(id = following_id)

        #bool which is false if relationship already exists
        created = Relationship.objects.get_or_create(follower=follower, following=following)

        if created:
            return JsonResponse({"message": "Relationship created successfully"}, status=201)
        else:
            return JsonResponse({"message": "Relationship already exists"}, status=200)
        
    except User.DoesNotExist:
        return JsonResponse({"error": "One or both users do not exist"}, status=404)
    



#Get_Followers Method
#Param: Requires id of user you want to check the followers for
#Returns a JSON Dictionary which contains the follower ids as the key and username as value
#Example URL 
#http://127.0.0.1:8000/get_followers/?id=1
def get_followers(request):

    user_id = request.GET.get('id')

    #ids of users that follow given user
    followers_ids = set(Relationship.objects.filter(following_id=user_id).values_list('follower_id', flat=True))

    #ids the user follows
    following_ids = set(Relationship.objects.filter(follower_id=user_id).values_list('following_id', flat=True))

    #creates set with only followers
    non_mutual_ids = set(followers_ids.difference(set(following_ids)))

    #grabs followers id and name
    follower_info = User.objects.filter(id__in=non_mutual_ids).values('id','name')

    #returns dictionary where id is the key and name is the value
    response = {str(user['id']): user['name'] for user in follower_info}

    return JsonResponse(response, status=200)






#Get_Following Method
#Param: Requires id of user you want to check the followers for
#Returns a JSON Dictionary which contains the which users the current user is following
#Example URL 
#http://127.0.0.1:8000/get_following/?id=1
def get_following(request):

    user_id = request.GET.get('id')
   
    #ids of users that follow given user
    followers_ids = set(Relationship.objects.filter(following_id=user_id).values_list('follower_id', flat=True))

    #ids the user follows
    following_ids = set(Relationship.objects.filter(follower_id=user_id).values_list('following_id', flat=True))

    #creates set with only followers
    following_only_ids = set(following_ids.difference(set(followers_ids)))
    
    #grabs followers id and name
    following_info = User.objects.filter(id__in=following_ids).values('id','name')

    #returns dictionary where id is the key and name is the value
    response = {str(user['id']): user['name'] for user in following_info}

    return JsonResponse(response, status=200)






#Mutual Friends Method
#Param: id of user whos mutual friends you are searching for
#Returns a JSON Dictionary which contains the friends id as the key and username as value
#Example URL 
#http://127.0.0.1:8000/get_mutual_friends/?id=1
def get_mutual_friends(request):

    user_id = request.GET.get('id')

    #ids of users that follow given user
    followers_ids = set(Relationship.objects.filter(following_id=user_id).values_list('follower_id', flat=True))

    #ids the user follows
    following_ids = set(Relationship.objects.filter(follower_id=user_id).values_list('following_id', flat=True))

    #Mutual friends are the intersection of following and followers
    mutual_friend_ids = set(following_ids).intersection(set(followers_ids))

    mutual_info = User.objects.filter(id__in=mutual_friend_ids).values('id','name')

    #returns dictionary where id is the key and name is the value
    response = {str(user['id']): user['name'] for user in mutual_info}

    return JsonResponse(response, status=200)

