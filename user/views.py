from django.shortcuts import render
from user_login.utils import get_cognito_client
from django.http import JsonResponse
from movie.models import Watchlist
from user.models import User, Relationship, MemberRecommendation, Message, BlockList
from movie.models import Watchlist, WatchlistItem, UserMovieJournal,Movie
from group.models import Group
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.core.exceptions import ObjectDoesNotExist
import json
import os
import requests
from django.views.decorators.csrf import csrf_exempt
import jwt
from django.core import serializers


#remove in production
from django.views.decorators.csrf import csrf_exempt


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


#Create Watchlist Method
#Desc: Creates watchlist for user. User cannot have 2 watchlists with the same name
#params: optional id param: No needed but can speed up request if given
#Returns a dictionary where success is true or false
def create_watchlist(request):

    if request.method in ['POST', 'GET']:
        user_id = None

        if 'id' in request.GET:
            user_id = request.GET.get('id')
            try:
                watchlist = Watchlist.objects.create(user_id=user_id)
                return JsonResponse({'success': True, 'message': 'Watchlist created successfully.', 'data': {
                    'user_id': user_id
                }})
            except Exception as e:
                return JsonResponse({'success': False, 'message': f'An error occurred: {str(e)}'}, status=500)


        else:
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
    
    movie_id = request.GET.get('movie_id') #grabs movie id from query
    watchlist_name = request.GET.get('watchlist_name', 'Watchlist')  # Default watchlist is Watchlist'
    
    if 'id' in request.GET:
        user_id = request.GET.get('id')
        watchlist = Watchlist.objects.get(user_id=user_id, name=watchlist_name) 
        try:
            watchlist = WatchlistItem.objects.create(watchlist=watchlist, movie_id=movie_id)
            return JsonResponse({'success': True, 'message': 'Movie successfully added to watchlist.', 'data': {
                'user_id': user_id
            }})
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'An error occurred: {str(e)}'}, status=500)    

    else:
        try:

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
#If a user decides to unfollow another use you can use this same method
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

        if Relationship.objects.filter(follower=follower, following=following).exists():
            Relationship.objects.filter(follower=follower, following=following).delete()

            return JsonResponse({"message": "Relationship removed"}, status=200)            

        #bool which is false if relationship already exists
        created = Relationship.objects.get_or_create(follower=follower, following=following)

        if created:
            return JsonResponse({"message": "Relationship created successfully"}, status=201)

        
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

    follower_info = User.objects.filter(id__in=followers_ids).values('id', 'name')

    response = {str(user['id']): user['name'] for user in follower_info}

    return JsonResponse(response, status=200)



#Get_Following Method
#Param: Requires id of user you want to check the followers for
#Returns a JSON Dictionary which contains the which users the current user is following
#Example URL 
#http://127.0.0.1:8000/get_following/?id=1
def get_following(request):
    user_id = request.GET.get('id')

    #ids the user follows
    following_ids = set(Relationship.objects.filter(follower_id=user_id).values_list('following_id', flat=True))
    
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

    # ids of users that follow given user
    followers_ids = set(Relationship.objects.filter(following_id=user_id).values_list('follower_id', flat=True))

    # ids the user follows
    following_ids = set(Relationship.objects.filter(follower_id=user_id).values_list('following_id', flat=True))

    # Mutual friends are the intersection of following and followers
    mutual_friend_ids = set(following_ids).intersection(set(followers_ids))

    mutual_friends = User.objects.filter(id__in=mutual_friend_ids).values('id', 'username')
    
    # Convert to list of dictionaries in the format frontend expects
    friends_list = [
        {'id': friend['id'], 'username': friend['username']}
        for friend in mutual_friends
    ]

    return JsonResponse({'friends': friends_list}, status=200)



#Grab Watchlist method
#Desc: Grabs all user watchlists
#params: optional param id: Not required but can speed up request
#returns: Dictionary containing all watchlists
@csrf_exempt
def grab_watchlists(request):
    try:
        if 'id' in request.GET:
            id = request.GET.get('id')
        else:
            username = get_user_username(request.session.get("access_token")).get('username')
            id = (User.objects.get(name=username)).id #needed to grab users watchlists
        watchlist = Watchlist.objects.filter(user_id=id) 

        watchlist_data = list(watchlist.values())  #Converts QuerySet to a list of dictionaries
        
        # Return the JSON response
        return JsonResponse({"status": "success", "watchlist": watchlist_data}, safe=False)
    except User.DoesNotExist:
        return JsonResponse({"status": "error", "message": "User not found"}, status=404)
    except Watchlist.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Watchlist not found"}, status=404)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
    

#Grab Watchlist items
#params: optional id: not required but can speed up request
#return: Dictionary with all watchlist items
@csrf_exempt
def grab_watchlist_items(request):
    try:
        if 'id' in request.GET:
            id = request.GET.get('id')
        else:
            username = get_user_username(request.session.get("access_token")).get('username')
            id = (User.objects.get(name=username)).id

        watchlist_name = request.GET.get('watchlist_name', 'Watchlist')

        watchlist = Watchlist.objects.get(user_id=id, name = watchlist_name)

        watchlist_items = watchlist.items.all()

        items = list(watchlist_items.values())

        return JsonResponse({"status": "success", "watchlist": items}, safe=False)
    except User.DoesNotExist:
        return JsonResponse({"status": "error", "message": "User not found"}, status=404)
    except Watchlist.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Watchlist not found"}, status=404)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

#Add to watched method
#Param: user_id, movie_id
#Optional Params: Rating and review
#Desc: Adds movie to users journal 
#Example
#Url: http://127.0.0.1:8000/add_to_watched/?user_id=1&movie_id=24&rating=4&review=amazing%20movie%20would%20watch%20again%20and%20again
@csrf_exempt
def add_to_watched(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        user_id = data.get('user_id')
        movie_id = data.get('movie_id')
        rating = data.get('rating', None)  #default rating to None
        review = data.get('review')

        if not user_id or not movie_id:
            return JsonResponse({'error': 'user_id and movie_id are required.'}, status=400)

        if rating is not None:  #Ensure rating is not None before processing
            try:
                rating = int(rating)
                if rating < 1 or rating > 5:
                    return JsonResponse({'error': 'Rating must be between 1 and 5.'}, status=400)
            except ValueError:
                return JsonResponse({'error': 'Rating must be an integer.'}, status=400)

        if review and len(review) > 2000:
            return JsonResponse({'error': 'Review must not exceed 2000 characters.'}, status=400)

        #retrieve user and movie instances
        user = User.objects.get(id=user_id)
        movie = Movie.objects.get(id=movie_id)

        #add entry to the UserMovieJournal table
        journal_entry, created = UserMovieJournal.objects.get_or_create(
            user=user,
            movie=movie,
            defaults={
                "rating": rating if rating is not None else 0,  #set default value
                "review": review if review else '',
            }
        )

        if created:  #case for newly added entry
            return JsonResponse({'message': 'Movie added to watched list successfully.'}, status=201)
        elif not created:
            #case if entry already exists
            if rating is not None:
                journal_entry.rating = rating
            if review is not None:
                journal_entry.review = review
            journal_entry.save()

        return JsonResponse({'message': 'Movie updated in watched list successfully.'}, status=200)

    return JsonResponse({'error': 'Invalid HTTP method. Use POST.'}, status=405)



#Recommend Movie
#params: Must send post request,
#member_suggested: User id of who suggested movie,
#user_recieving: user id of who is recieving rec,
#movie_id: movie_id that was suggested
#returns: Success and recommendation id if request was successful
@csrf_exempt
def recommend_movie(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            member_suggested_id = data.get("member_suggested")
            user_receiving_id = data.get("user_receiving")
            movie_id = data.get("movie_id")

            # Ensure movie_id is an integer
            try:
                movie_id = int(movie_id)
            except (ValueError, TypeError):
                return JsonResponse({"error": "Invalid movie ID."}, status=400)


            movie = Movie.objects.get(id=movie_id)
            query_params = {
                't': movie.title,
                'y': movie.year
            }
            #print(movie.title, "\n", movie.year)

            OMDB_API_KEY = os.getenv("OMDB_API_KEY")
            omdb_url = f"http://www.omdbapi.com/?apikey={OMDB_API_KEY}"

            response = requests.get(omdb_url, params=query_params)
            data = response.json()

            if data.get("Response") == "False":
                return JsonResponse({"error": "Movie not found in OMDb."}, status=404)

            movie_genre = data.get("Genre", "Unknown Genre")
            genres = movie_genre.split(',')
            genres = [genre.strip() for genre in genres]
                
            #print(genres)

            # Check if required fields are provided
            if not all([member_suggested_id, user_receiving_id, movie_id]):
                return JsonResponse({"error": "Missing required fields."}, status=400)
            
           

            # Validate if users exist before proceeding
            try:
                member_suggested = User.objects.get(id=member_suggested_id)
            except User.DoesNotExist:
                return JsonResponse({"error": "Member suggesting does not exist."}, status=400)

            try:
                user_receiving = User.objects.get(id=user_receiving_id)
            except User.DoesNotExist:
                return JsonResponse({"error": "User receiving does not exist."}, status=400)
            
            group = Group.objects.filter(group_id=user_receiving).first()
            if group:
                if group.genre and group.genre not in genres:
                    return JsonResponse({"error": "Movie doesn't fit group genre"}, status=400)

            # Create the recommendation record
            recommendation = MemberRecommendation.objects.create(
                member_suggested=member_suggested,
                user_receiving=user_receiving,
                movie_id=movie_id
            )
            
            return JsonResponse(
                {"message": "Movie recommended successfully.", "recommendation_id": recommendation.id}, 
                status=201
            )

        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON format."}, status=400)

    return JsonResponse({"error": "Invalid request method."}, status=405)


#Update Recommendation
#params: Requires post request,
#recommendation_id: row id of the recommendation which can be grabbed via group_recommedation method (universal function not just for groups)
#like: True or False
#returns: Dictionary which contains "Recommendation" if true add movie to watchlist otherwise do nothing
#
# @csrf_exempt
# def update_recommendation(request):
#     if request.method == "POST":
#         try:
#             data = json.loads(request.body)
#             recommendation_id = data.get("recommendation_id")
#             like = data.get('like')
#         except json.JSONDecodeError:
#             return JsonResponse({"error": "Invalid JSON format."}, status=400)

#         if MemberRecommendation.objects.filter(id = recommendation_id).exists():
#             recommendation = MemberRecommendation.objects.get(id = recommendation_id)
#         else:
#             return JsonResponse({"error": "Recommendation does not exist"})
        
#         #increments voting by 1
#         if like:
#             recommendation.voting = recommendation.voting + 1
#             #updates voting column
#             recommendation.save()
#         else:
#             recommendation.voting = recommendation.voting - 1
#             recommendation.save()

#         user_rec = recommendation.user_receiving

#         if Group.objects.filter(group_id = user_rec.id).exists():

#             group = Group.objects.get(group_id = user_rec.id)
#             voting_limit = group.voting_limit
#             #convert to decimal and divide by # of group members
#             if recommendation.voting >= voting_limit:
#                 return JsonResponse({"Recommendation": True})
#             else:
#                 return JsonResponse({"Recommendation": False})
#         # elif User.objects.filter(id = user_rec.id):
#         #     if recommendation.voting == 1:
#         #         return JsonResponse({"Recommendation": True})
#         #     else:
#         #         return JsonResponse({"Recommendation": False})

#         else:
#             return JsonResponse({"error": "Recieving user does not exist "})
        

#Send Messages method
#params: Requires post request, user_sending = id of user sending message,
#user_rec = id of user recieving, message = Message as string
#returns: Success if message is sent
@csrf_exempt
def send_messages(request):
    if request.method != "POST":
        return JsonResponse({"error": "This method reqires post request"})
    
    data = json.loads(request.body)

    user_sending = data.get("user_sending")
    user_rec = data.get("user_recieving")
    message = data.get("message")


    if User.objects.filter(id = user_sending).exists() and User.objects.filter(id = user_rec).exists():

        user_sending = User.objects.get(id = user_sending)
        user_rec = User.objects.get(id = user_rec)
        Message.objects.create(user_sending = user_sending, user_receiving = user_rec, message_content = message)

        return JsonResponse({'Success': "Message Sent!"})

    else:
        return JsonResponse({"error": "User does not exist"})


#Retrieve Messages method
#might not work frontend plz check
def retrieve_messages(request):

    user_1 = request.GET.get('user_id_1')
    user_2 = request.GET.get('user_id_2')
    
    # Read num_messages from query parameters (default to 50 if not provided)
    num_messages = request.GET.get('num_messages', '50')
    try:
        num_messages = int(num_messages)
    except ValueError:
        return JsonResponse({'error': 'Invalid number of messages'}, status=400)
    
    messages = Message.objects.filter(user_sending=user_1, user_receiving = user_2).order_by('-date_sent')[:num_messages]
    messages_data = []
    for msg in messages:
        messages_data.append({
            'id': msg.id,
            'user_sending': msg.user_sending.username,
            'user_recieving': msg.user_receiving.username,
            'message_content': msg.message_content,
            'date_sent': msg.date_sent,
            'status': msg.status,
        })
    return JsonResponse({'messages': messages_data})
  
            



#User Info Method
#Has no paramaters 
#returns username, email, id, and date joined
def user_info(request):
    id_token = request.session.get("id_token")
    
    if not id_token:
        return JsonResponse({"error": "No ID token found in session"}, status=401)
    
    # Ensure the token is bytes
    if isinstance(id_token, str):
        id_token = id_token.encode("utf-8")

    try:
        decoded_token = jwt.decode(id_token, options={"verify_signature": False})
        user = User.objects.get(email=decoded_token.get("email"))
        
        return JsonResponse({
            "username": user.username,
            "email": user.email,
            "id": user.id,
            "date_joined": user.date_joined,
        })
    except ObjectDoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)
    except Exception as e:
        # Catch-all for other decode or unexpected errors
        return JsonResponse({"error": str(e)}, status=500)

        
                   
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse

@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({'status': 'ok'})


# #Retrieve_messages method
# #params:
# #user_id: Used to retrieve messages relating to that user
# #returns: Messages sent and recieved by that user
# def retrieve_messages(request):
#     if request.method != "GET":
#         return JsonResponse({"error": "This method reqires get request"})
    
#     user_id = request.GET.get("user_id")

#     if User.objects.filter(id = user_id).exists():
#         messages = Message.objects.filter(Q(user_sending_id=user_id) | Q(user_receiving_id=user_id)).order_by('date_sent')

#         #Serializes messages into a JSON format
#         messages_data = [
#             {
#                 "id": msg.id,
#                 "user_sending": msg.user_sending.id,
#                 "user_receiving": msg.user_receiving.id,
#                 "content": msg.message_content,
#                 "date_sent": msg.date_sent,
#                 "status":msg.status
#             }
#             for msg in messages
#         ]

#         return JsonResponse({'success': True, 'messages': messages_data})
#     else:
#         return JsonResponse({"error":"User does not have messages"})


#Retrieve recently watched method
#params: Requires user_id
#returns: Returns all watched movies in descending order of date watched
def retrieve_recently_watched(request):

    user_id = request.GET.get("user_id")

    watched = UserMovieJournal.objects.filter(user=user_id).order_by('-date_watched')
    data = [
        {
            "movie": movie.movie.id,
            "title":movie.movie.title,
            "rating": movie.rating,
            "review": movie.review,
            "date_watched": movie.date_watched.isoformat()
            
        }
        for movie in watched
    ]

    return JsonResponse(data, safe=False)


#Update Username method
#params: "username" = which is the username the user wants
#Returns: Success if saved properly
def update_username(request):
    
    update_name = request.GET.get("username")
    
    user_data_response  = user_info(request)

    user_data = json.loads(user_data_response.content)  

    entry = User.objects.get(id=user_data.get("id"))

    entry.name = update_name

    entry.save()

    return JsonResponse({'success': True})

def username(request):
    

    return JsonResponse({'username': get_user_username(request.session.get("access_token")).get('username')})
    

#method that allows user to block another user. functions as a toggle 
#params: blocker_id(id of user who is blocking other user), blocked_id(id of user who is being blocked)
#returns: "user blocked/unblocked" if user is found, returns, "user not found" if user not found
@csrf_exempt
def block_user(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            blocker_id = data.get("blocker_id")
            blocked_id = data.get("blocked_id")

            if blocker_id == blocked_id:
                return JsonResponse({"error": "You cannot block yourself."}, status=400)

            blocker = User.objects.get(id=blocker_id)
            blocked = User.objects.get(id=blocked_id)

            #unblock if already blocked
            if BlockList.objects.filter(blocker=blocker, blocked=blocked).exists():
                BlockList.objects.filter(blocker=blocker, blocked=blocked).delete()
                return JsonResponse({"message": "User Unblocked"}, status=200)

            BlockList.objects.create(blocker=blocker, blocked=blocked)
            return JsonResponse({"message": "User blocked successfully."}, status=201)

        except User.DoesNotExist:
            return JsonResponse({"error": "User not found."}, status=404)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON format."}, status=400)

    return JsonResponse({"error": "Invalid request method."}, status=405)


#allows user to view users that they have blocked.
#params: user_id, id of current user
#returns dictionary of users the current user has blocked.
def view_blocked_users(request):

    user_id = request.GET.get('id')

    #ids of users that are blocked by user
    blocked_ids = BlockList.objects.filter(blocker_id=user_id).values_list('blocked_id', flat=True)

    blocked_list = User.objects.filter(id__in=blocked_ids).values('id','name')

    #returns dictionary where id is the key and name is the value
    response = {str(user['id']): user['name'] for user in blocked_list}

    return JsonResponse(response, status=200)

#checks if a viewed profile has the user blocked.
#params: searcher_id-id of user looking at other profile, profile_id-id of profile being viewed by user
#returns: true if user is blocked, false if not  
def check_blocked(request):
    searcher_id = request.GET.get("searcher_id")
    profile_id = request.GET.get("profile_id")

    if not searcher_id or not profile_id:
        return JsonResponse({'error': 'Missing parameters'}, status=400)

    # Check if profile has blocked viewer
    is_blocked = BlockList.objects.filter(blocker_id=profile_id, blocked_id=searcher_id).exists()

    return JsonResponse({'blocked_by_them': is_blocked})

def frontend_username(request):
    user_id = request.GET.get("user_id")

    if User.objects.filter(id = user_id).exists():
        return JsonResponse({"Username": User.objects.get(id=user_id).username}, status = 200)
    else:
        return JsonResponse({"Failure":"User does not exist"}, status=400)



    


 