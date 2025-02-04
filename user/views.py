from django.shortcuts import render
from user_login.utils import get_cognito_client
from django.http import JsonResponse
from movie.models import Watchlist
from user.models import User, Relationship, MemberRecommendation, Message
from movie.models import Watchlist, WatchlistItem, UserMovieJournal,Movie
from group.models import Group
from django.shortcuts import get_object_or_404
from django.db.models import Q
import json
import jwt

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
            return JsonResponse({'success': True, 'message': 'Watchlist created successfully.', 'data': {
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
def add_to_watched(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        user_id = data.get('user_id')
        movie_id = data.get('movie_id')
        rating = data.get('rating')
        review = data.get('review')

        # Validate required parameters
        if not user_id or not movie_id:
            return JsonResponse({'error': 'user_id and movie_id are required.'}, status=400)

    if rating:
            try:
                rating = int(rating)
                if rating < 1 or rating > 5:
                    return JsonResponse({'error': 'Rating must be between 1 and 5.'}, status=400)
            except ValueError:
                return JsonResponse({'error': 'Rating must be an integer.'}, status=400)

    if review and len(review) > 2000:
                return JsonResponse({'error': 'Review must not exceed 2000 characters.'}, status=400)
    

    # Retrieve user and movie instances
    user = User.objects.get(id=user_id)
    movie = Movie.objects.get(id=movie_id)


        # Add entry to the UserMovieJournal table
    journal_entry, created = UserMovieJournal.objects.get_or_create(
        user=user,
        movie=movie,
        defaults={
                "rating": rating if rating is not None else 0,  # Default rating
                "review": review if review else '',  # Default review
        }
    )

    if created:
        return JsonResponse({'message': 'Movie added to watched list successfully.'}, status=201)
    elif not created:
                # Update rating and review if the entry already exists
                if rating is not None:
                    journal_entry.rating = rating
                if review is not None:
                    journal_entry.review = review
                journal_entry.save()

    return JsonResponse({'error': 'Invalid HTTP method. Use POST.'}, status=405)


@csrf_exempt
def recommend_movie(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            member_suggested_id = data.get("member_suggested")
            user_receiving_id = data.get("user_receiving")
            movie_id = data.get("movie_id")


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

            # Ensure movie_id is an integer
            try:
                movie_id = int(movie_id)
            except (ValueError, TypeError):
                return JsonResponse({"error": "Invalid movie ID."}, status=400)

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



@csrf_exempt
def update_recommendation(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            recommendation_id = data.get("recommendation_id")
            like = data.get('like')
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON format."}, status=400)

        if MemberRecommendation.objects.filter(id = recommendation_id).exists:
            recommendation = MemberRecommendation.objects.get(id = recommendation_id)
        else:
            return JsonResponse({"error": "Recommendation does not exist"})
        
        #increments voting by 1
        if like:
            recommendation.voting = recommendation.voting + 1
            #updates voting column
            recommendation.save()
        else:
            recommendation.voting = recommendation.voting - 1
            recommendation.save()

        user_rec = recommendation.user_receiving
        if Group.objects.filter(group_id = user_rec).exists():

            group = Group.objects.get(group_id = user_rec)
            voting_limit = group.voting_limit
            #convert to decimal and divide by # of group members
            if recommendation.voting >= voting_limit:
                return JsonResponse({"Recommendation": True})
            else:
                return JsonResponse({"Recommendation": False})
        elif User.objects.filter(group_id = user_rec):
            pass
        else:
            return JsonResponse({"error": "Recieving user does not exist "})
        

@csrf_exempt
def send_messages(request):
    if request.method != "POST":
        return JsonResponse({"error": "This method reqires post request"})
    
    data = json.loads(request.body)

    user_sending = data.get("user_sending")
    user_rec = data.get("user_recieving")
    message = data.get("message")

    print(User.objects.filter(id = user_sending).exists())
    print(User.objects.filter(id = user_rec).exists())

    if User.objects.filter(id = user_sending).exists() and User.objects.filter(id = user_rec).exists():

        user_sending = User.objects.get(id = user_sending)
        user_rec = User.objects.get(id = user_rec)
        Message.objects.create(user_sending = user_sending, user_receiving = user_rec, message_content = message)

        return JsonResponse({'Success': "Message Sent!"})

    else:
        return JsonResponse({"error": "User does not exist"})


def retrieve_messages(request, num_messages):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'User not authenticated'}, status=401)
    
    try:
        num_messages = int(num_messages)
    except ValueError:
        return JsonResponse({'error': 'Invalid number of messages'}, status=400)
    
    messages = Message.objects.filter(user_receiving=request.user).order_by('-date_sent')[:num_messages]
    messages_data = []
    for msg in messages:
        messages_data.append({
            'id': msg.id,
            'user_sending': msg.user_sending.username,
            'user_receiving': msg.user_receiving.username,
            'message_content': msg.message_content,
            'date_sent': msg.date_sent,
            'status': msg.status,
        })
    return JsonResponse({'messages': messages_data})      
            







