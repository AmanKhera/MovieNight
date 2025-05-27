from django.shortcuts import render
from user.models import Message
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from datetime import timedelta, datetime
import json
import logging
from django.views.decorators.http import require_POST
from user.models import User
from group.models import Group, GroupMember
from movie.models import Watchlist, WatchlistItem, UserMovieJournal, Movie
from user.views import get_user_username, create_watchlist
from user.models import MemberRecommendation, RecommendationVote
from dotenv import load_dotenv
from openai import OpenAI
import os
from django.db.models import Max, OuterRef, Subquery
from django.db.models import Subquery, OuterRef
from math import ceil
from django.shortcuts import get_object_or_404


load_dotenv()
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
logger = logging.getLogger(__name__)

@csrf_exempt
def create_group(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    try:
        data = json.loads(request.body)
        group_name = data.get("group_name")
        leader_id = data.get("leader_id")
        genre = data.get("genre", None)

        #Validate required fields
        if not group_name or not leader_id:
            return JsonResponse({'error': 'Missing required fields'}, status=400)

        #Grab User
        try:
            user = User.objects.get(id=leader_id)
        except ObjectDoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)

        #Check for duplicate names
        if Group.objects.filter(leader_id=user, group_name=group_name).exists():
            return JsonResponse({'error': 'Group name already exists'}, status=400)

        #Create Group
        New_Group = User.objects.create(
            name=group_name,
            email=f"{group_name.replace(' ', '_').lower()}_{user.id}@group.local"
        )


        Group_ = Group.objects.create(
            group_id=New_Group,
            leader_id=user.id,
            group_name=group_name,
            genre=genre,
            voting_limit=1
        )
        GroupMember.objects.create(
            group=Group_,
            member=user,
            role='admin'
        )

        #populates groups user movie journal with movies the user has seen
        leader_watched_movies = UserMovieJournal.objects.filter(user=user)
        group_watched = [
            UserMovieJournal(
                user = New_Group,
                movie = entry.movie,
                #date_watched = entry.date_watched,
                #rating = entry.rating,
                #review = entry.review,
                #favorite = entry.favorite
            )
            for entry in leader_watched_movies
        ]      
        UserMovieJournal.objects.bulk_create(group_watched)


        watchlist = Watchlist.objects.create(user_id=New_Group.id)

        leaderWatchlist = Watchlist.objects.get(user=user, type='MAIN')

        leader_watchlist = WatchlistItem.objects.filter(watchlist=leaderWatchlist)

        group_watchlist = [
            WatchlistItem(
                watchlist = watchlist,
                movie = entry.movie,
                #date_watched = entry.date_watched,
                #rating = entry.rating,
                #review = entry.review,
                #favorite = entry.favorite
            )
            for entry in leader_watchlist
        ]      
        WatchlistItem.objects.bulk_create(group_watchlist)


        return JsonResponse({'message': 'Group created successfully'}, status=201)

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON input'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

    

#Add Member To Group
#params: group_id (group the member will be added to), member_id (member to be added)
#returns: Status 200 if success
@csrf_exempt
def add_member_to_group(request):
    
    try:
        group_id = request.GET.get("group_id")
        username = request.GET.get("username")

        group = Group.objects.get(group_id=group_id)
        member = User.objects.get(username=username)

        if GroupMember.objects.filter(group=group, member=member).exists():
            return JsonResponse({'message': 'Member is already a part of this group'}, status=200)

        GroupMember.objects.create(group=group, member=member)

        total_members = GroupMember.objects.filter(group=group).count()
        group.voting_limit = ceil(total_members / 2)
        group.save(update_fields=['voting_limit'])

        #Grabs groups watched movies
        group_movie_ids = set(UserMovieJournal.objects.filter(user=group_id).values_list('movie_id', flat = True))

        #grabs new users watched movies
        new_member_movie_id = set(UserMovieJournal.objects.filter(user=member.id).values_list('movie_id', flat = True))

        #Find intersection of movies watched by group and new user
        keep_ids = group_movie_ids & new_member_movie_id
        #removes movies not seen by everyone
        UserMovieJournal.objects.filter(user=group_id).exclude(movie_id__in=keep_ids).delete()


        group_watchlist = Watchlist.objects.get(user=group_id)
        new_member_watchlist = Watchlist.objects.get(user=member.id)

        movies_in_watchlist = set(WatchlistItem.objects.filter(watchlist=group_watchlist).values_list('movie_id', flat=True))

        new_member_watchlist_items = set(WatchlistItem.objects.filter(watchlist=new_member_watchlist).values_list('movie_id', flat=True))

        shared_movie_ids  = new_member_watchlist_items & movies_in_watchlist

        WatchlistItem.objects.filter(
            watchlist=group_watchlist
        ).exclude(movie_id__in=shared_movie_ids).delete()

        existing_ids = set(
            WatchlistItem.objects.filter(watchlist=group_watchlist)
            .values_list('movie_id', flat=True)
        )
        missing_ids = shared_movie_ids - existing_ids

        new_items = [
            WatchlistItem(watchlist=group_watchlist, movie_id=movie_id)
            for movie_id in missing_ids
        ]
        WatchlistItem.objects.bulk_create(new_items)       



        return JsonResponse({'message': 'Member added to group!'})

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON input'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)



#Remove Member From Group
#Params: remove_id (person being removed), group_id
@csrf_exempt
def remove_member_from_group(request):
    try:
        data = json.loads(request.body)
        username = data.get("username")
        current_user_id = User.objects.get(username=username).id  # Ensure leader is the one removing members
        member_to_be_removed_id = data.get('remove_id')
        group_id = data.get("group_id")


        # Use get to retrieve a single group instance
        group = Group.objects.get(group_id=group_id)
        if group.leader_id != current_user_id:
            return JsonResponse({"error": "Not authorized to remove member"}, status=403)

        GroupMember.objects.filter(group=group, member_id=member_to_be_removed_id).delete()
        total_members = GroupMember.objects.filter(group=group).count()
        group.voting_limit = ceil(total_members / 2)
        group.save(update_fields=["voting_limit"])
        
        #Groups Current journal
        group_movie_ids = set(
            UserMovieJournal.objects
                .filter(user=group_id)
                .values_list("movie_id", flat=True)
        )

        #Grabbing current Members
        remaining_member_ids = GroupMember.objects.filter(group=group) \
            .values_list("member_id", flat=True)

        #Grab all movies in common
        for mid in remaining_member_ids:
            member_movies = set(
                UserMovieJournal.objects
                    .filter(user=mid)
                    .values_list("movie_id", flat=True)
            )
            group_movie_ids &= member_movies

        #Delete movies not in intersection
        UserMovieJournal.objects.filter(user=group_id) \
            .exclude(movie_id__in=group_movie_ids) \
            .delete()


        group_watchlist = Watchlist.objects.get(user=group_id, type=Watchlist.MAIN)
        shared_watchlist_ids = None

        for member_id in remaining_member_ids:
            try:
                member_watchlist = Watchlist.objects.get(user_id=member_id, type=Watchlist.MAIN)
                member_movie_ids = set(
                    WatchlistItem.objects.filter(watchlist=member_watchlist)
                    .values_list('movie_id', flat=True)
                )
                if shared_watchlist_ids is None:
                    shared_watchlist_ids = member_movie_ids
                else:
                    shared_watchlist_ids &= member_movie_ids
            except Watchlist.DoesNotExist:
                shared_watchlist_ids = set() if shared_watchlist_ids is None else shared_watchlist_ids & set()

        if shared_watchlist_ids is None:
            shared_watchlist_ids = set()

        #Remove non-shared items from the group's watchlist
        WatchlistItem.objects.filter(
            watchlist=group_watchlist
        ).exclude(movie_id__in=shared_watchlist_ids).delete()
        
        #Add any missing shared items
        existing_ids = set(
            WatchlistItem.objects.filter(watchlist=group_watchlist)
            .values_list('movie_id', flat=True)
        )
        missing_ids = shared_watchlist_ids - existing_ids

        new_items = [
            WatchlistItem(watchlist=group_watchlist, movie_id=movie_id)
            for movie_id in missing_ids
        ]
        WatchlistItem.objects.bulk_create(new_items)



        return JsonResponse({"Success": "User has been removed from the group"}, status=200)
           
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON input'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


#Get User Groups
#return: The list of groups the user is a part of
@csrf_exempt
def get_user_groups(request):
    try:
        username = request.GET.get("username")  # Get from query parameters instead

        user = User.objects.get(username=username)

        # Get all group memberships for the user
        memberships = user.group_memberships.all()

        groups = [
            {
                "group_id": membership.group_id,
                "group_name": membership.group.group_name,
                "role": membership.role,
                "joined_at": membership.joined_at,
            }
            for membership in memberships
        ]

        return JsonResponse({"groups": groups}, status=200)

    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

   
#Group Recommendation
#Retrieves recent movie recommendations for the group/user within last 7 days
#params: group_id which can be group or user
#returns: JsonResponse containing recommendations as a list
def group_recommendation(request):
    group_id = request.GET.get('group_id')
    try:
        seven_days = timezone.now() - timedelta(days=7)

        # Retrieves recommendations in the past 7 days excluding a specific suggestion
        recommendations = MemberRecommendation.objects.filter(
            user_receiving=group_id,
            date_suggested__gte=seven_days
        ).exclude(member_suggested=7648).order_by('-votes')

        movie_ids = [recs.movie_id for recs in recommendations]
        movies = Movie.objects.filter(id__in=movie_ids).values_list('id', 'title', 'year')
        movie_map = {mid: {"title": title, "year": year} for mid, title, year in movies}

        recommendations_list = list(recommendations.values())

        for rec_dict in recommendations_list:
            movie_data = movie_map.get(rec_dict['movie_id'], {})
            rec_dict['movie_title'] = movie_data.get("title")
            rec_dict['movie_year'] = movie_data.get("year")

        return JsonResponse({"Recommendations": recommendations_list})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)







# def group_recommendation(request):
#     group_id = request.GET.get('group_id')
#     try:

#         seven_days = timezone.now() - timedelta(days=7)

#         #retrives recommendations in the past 7 days
#         recommendations = MemberRecommendation.objects.filter(
#         user_receiving=group_id,
#         date_suggested__gte=seven_days
#          ).exclude(member_suggested=7648).order_by('-votes')
        
#         movie_ids = [recs.movie_id for recs in recommendations]
#         movies = Movie.objects.filter(id__in=movie_ids).values_list('id', 'title', 'year')
#         title_map = {mid: title for mid, title in movies}


#         titles = [ title_map.get(r.movie_id) for r in recommendations ]

        
#         recommendations_list = list(recommendations.values())

#         for idx, rec_dict in enumerate(recommendations_list):
#             rec_dict['movie_title'] = titles[idx]


#         return JsonResponse({"Recommendations": recommendations_list})
#     except Exception as e:
#         return JsonResponse({"error": str(e)}, status=500)
    

#Just use removed method
# #WHEN MEMBER REMOVED FROM GROUP UPDATE WATCHED MOVIES
# @csrf_exempt
# def leave_group(request):

#     if request.method == 'POST':
#         try:
#             data = json.loads(request.body)
#             user_id = data.get('user_id')
#             group_id = data.get('group_id')

#             group = Group.objects.get(group_id=group_id)

#             membership = GroupMember.objects.get(group=group, member_id=user_id)
#             membership.delete()

#             return JsonResponse({"message": "User has left the group"}, status=200)

#         except GroupMember.DoesNotExist:
#             return JsonResponse({"error": "User is not in group"}, status=500)
#         except Group.DoesNotExist:
#             return JsonResponse({"error": "Group not found"}, status=404)
#         except Exception as e:
#             return JsonResponse({"error": str(e)}, status=500)

#     return JsonResponse({"error": "Invalid request method"}, status=405)
        
#Retrieve Group Messages Method
#Desc: Retreives groups most recent messages
#Params: Group_id (group requesting the messages), num_messages(# of messages should be retrieved)
#Return: msg.id, user_sending:Who sent message, user_recieving: User recieving message, message_content: content of message, date_sent, status: Sent,Pending, Deleted        
def retrieve_group_messages(request):

    group_id = request.GET.get('group_id')

    # Read num_messages from query parameters (default to 50 if not provided)
    num_messages = request.GET.get('num_messages', '50')

    try:
        num_messages = int(num_messages)
    except ValueError:
        return JsonResponse({'error': 'Invalid number of messages'}, status=400)


    messages = Message.objects.filter(user_receiving = group_id).order_by('-date_sent')[:num_messages]
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



#Update Recommendation Method
#Desc: Updates recommendation given in group, allows for tracking of votes by updated RecommendationVote table
#Params: user_id(id of user voting), recommendation_id(recommendation the user is voting for), vote_value(1 for true, -1 for false, and 0 by default if the user has not voted)
#returns: total number of upvotes, downvotes, threshold needed to be added to watchlist, recommended: 1 if it should be added to watchlist, 0 if it shouldnt
@csrf_exempt
@require_POST
def update_recommendation(request):
    try:
        data = json.loads(request.body)
        user_id = data["user_id"]
        recommendation_id = data["recommendation_id"]
        vote_value = int(data.get("value"))
    except (KeyError, ValueError, json.JSONDecodeError):
        return JsonResponse({"error": "Invalid payload"}, status=400)

    user = get_object_or_404(User, id=user_id)
    rec  = get_object_or_404(MemberRecommendation, pk=recommendation_id)

    # get_or_create with correct defaults dict
    vote_obj, created = RecommendationVote.objects.get_or_create(
        user=user,
        recommendation=rec,
        defaults={"value": vote_value}
    )

    if not created:
        # user already voted; check if same vote
        if vote_obj.value == vote_value:
            return JsonResponse({"error": "You've already voted."}, status=400)
        # otherwise, update to the new vote
        vote_obj.value = vote_value
        vote_obj.save(update_fields=["value"])

    # recompute counts
    upvote_count = RecommendationVote.objects.filter(
        recommendation=rec,
        value=RecommendationVote.UP_VOTE
    ).count()
    downvote_count = RecommendationVote.objects.filter(
        recommendation=rec,
        value=RecommendationVote.DOWN_VOTE
    ).count()

    # update rec.recommended based on group threshold
    group = get_object_or_404(Group, group_id=rec.user_receiving)
    limit = group.voting_limit

    new_state = 0
    if upvote_count >= limit:
        new_state = RecommendationVote.UP_VOTE
    elif downvote_count >= limit:
        new_state = RecommendationVote.DOWN_VOTE

    if new_state != rec.recommended:
        rec.recommended = new_state
        rec.save(update_fields=["recommended"])

    return JsonResponse({
        "recommended": new_state,
        "upvotes":     upvote_count,
        "downvotes":   downvote_count,
        "threshold":   limit,
    })





#Generate Group Recommendations
#Desc: Called via retrieve_model_recommendations when # of recs is below 20
#Generates recs by calling OpenAI with prompt
#Params: Group_id(id of group looking for recs), num_of_recs(Number of recs needed to reach 20)
#returns: Dictionary with movie title, rec id, and date suggested
def generate_group_recommendations(group_id, num_of_recs):

    group = User.objects.get(pk=group_id)


    seen = Movie.objects.filter(user_journals__user=group).distinct()
    seen_titles = list(seen.values_list("title", flat=True))     


    #If user has not voted on recommendations before we use more tokens to create an accurate recommendation
    if MemberRecommendation.objects.filter(user_receiving=group).count() < 20:
            
        previously_watched = UserMovieJournal.objects.filter(user_id=group.id)


        liked = [f.movie.title for f in previously_watched if f.rating is not None and f.rating >= 3]
        disliked = [f.movie.title for f in previously_watched if f.rating is not None and f.rating <= 2]


        #Use seen and split seen into liked an disliked recommendations
        user_payload = {
        "liked_recommendations": liked,
        "disliked_recommendations": disliked,
        "seen": seen_titles,
        }

    #If user has voted on recommendations before we use less tokens
    #need to reduce MemberRecommendations to the last 50 recs
    else:
        previous_liked_recs = MemberRecommendation.objects.filter(user_receiving=group,recommended=1).values_list("movie_id", flat=True)
        previous_liked_recs = Movie.objects.filter(id__in=previous_liked_recs)

        previous_disliked_recs = MemberRecommendation.objects.filter(user_receiving=group,recommended=-1).values_list("movie_id", flat=True)
        previous_disliked_recs = Movie.objects.filter(id__in=previous_disliked_recs)

        #only use seen and previous recommendations
        user_payload = {
        "liked_recommendations": list(previous_liked_recs.values_list("title", flat=True)),
        "disliked_recommendations": list(previous_disliked_recs.values_list("title", flat=True)),
        "seen": seen_titles,
        }        


    system_prompt = (
        "You are a highly intelligent and discerning movie recommendation engine. "
        f"You must recommend exactly {num_of_recs} unique movies that the user has not seen. "
        "Use the `liked_recommendations` list to identify genres, themes, or styles the user enjoys. "
        "Avoid anything from `disliked_recommendations` or `seen`. "
        "Do not recommend any duplicates. "
        "Respond ONLY with a valid JSON object using this format: "
        "{\"recommendations\": [\"Movie Title 1\", \"Movie Title 2\", ..., \"Movie Title N\"]} "
        "where N is exactly the number requested"
        "Do not include any explanations or extra text — just the JSON."
    )


    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_payload)}
        ],
        max_tokens=400,
        temperature=0.7
    )

    gpt_content = response.choices[0].message.content
    parsed = json.loads(gpt_content)
    titles = parsed.get("recommendations", [])

    #create only the NEW ones
    created = []

    model_user = User.objects.get(email='chatgpt@gmail.com')

    for title in titles:
        #if movies seen before not added
        if title in seen_titles:
            continue
        

        movie = (
            Movie.objects
                .filter(title=title)
                .order_by("year")   
                .first()
        )
        if movie is None:    
            continue

        rec = MemberRecommendation.objects.create(
            movie_id=movie.id,
            member_suggested=model_user,    
            user_receiving=group,
            recommended=False,
        )


        created.append({
            "id": rec.id,
            "movie_title": movie.title,
            "date_suggested": rec.date_suggested.isoformat(),
        })

    return created



# @csrf_exempt
# def retrieve_model_recommendations(request):
#     group_id = request.GET.get("group_id")
#     user = User.objects.get(pk=group_id)
#     model_id = 7648

#     latest_ids = (
#         MemberRecommendation.objects
#         .filter(user_receiving=user, member_suggested = model_id ,recommended=0)
#         .values('movie_id')
#         .annotate(latest_id=Max('id'))
#         .values_list('latest_id', flat=True)
#     )

#     movie_title_sq = Movie.objects.filter(pk=OuterRef('movie_id')).values('title')[:1]

#     rows = (
#         MemberRecommendation.objects
#         .filter(id__in=latest_ids)
#         .annotate(movie_title=Subquery(movie_title_sq))
#         .order_by('-date_suggested')
#         .values('id', 'member_suggested','movie_id', 'movie_title', 'date_suggested')[:20]
#     )

#     if rows.count() < 20:
#         num_needed = 20 - rows.count()
#         generate_group_recommendations(group_id, num_needed)

#         latest_ids = (
#             MemberRecommendation.objects
#             .filter(user_receiving=user, member_suggested = model_id, recommended=0)
#             .values('movie_id')
#             .annotate(latest_id=Max('id'))
#             .values_list('latest_id', flat=True)
#         )

#         rows = (
#             MemberRecommendation.objects
#             .filter(id__in=latest_ids)
#             .annotate(movie_title=Subquery(movie_title_sq))
#             .order_by('-date_suggested')
#             .values('id', 'member_suggested' 'movie_id', 'movie_title', 'date_suggested')[:20]
#         )


#     return JsonResponse({"recommendations": list(rows)})


@csrf_exempt
def retrieve_model_recommendations(request):
    group_id = request.GET.get("group_id")
    user = User.objects.get(pk=group_id)
    model_id = 7648

    #Get latest rec per movie
    latest_ids = (
        MemberRecommendation.objects
        .filter(user_receiving=user, member_suggested=model_id, recommended=0)
        .values('movie_id')
        .annotate(latest_id=Max('id'))
        .values_list('latest_id', flat=True)
    )

    #subquery to pull in movie title
    movie_title_sq = Movie.objects.filter(pk=OuterRef('movie_id')).values('title')[:1]

    #Retrieve 20 most recent recs
    recommendations = (
        MemberRecommendation.objects
        .filter(id__in=latest_ids)
        .select_related('member_suggested')  
        .annotate(movie_title=Subquery(movie_title_sq))
        .order_by('-date_suggested')[:20]
    )

    #If fewer than 20, generate more and requery
    if recommendations.count() < 20:
        num_needed = 20 - recommendations.count()
        generate_group_recommendations(group_id, num_needed)

        latest_ids = (
            MemberRecommendation.objects
            .filter(user_receiving=user, member_suggested=model_id, recommended=0)
            .values('movie_id')
            .annotate(latest_id=Max('id'))
            .values_list('latest_id', flat=True)
        )

        recommendations = (
            MemberRecommendation.objects
            .filter(id__in=latest_ids)
            .select_related('member_suggested')
            .annotate(movie_title=Subquery(movie_title_sq))
            .order_by('-date_suggested')[:20]
        )


    recommendation_ids = [rec.id for rec in recommendations]

    #Get votes on those recommendations with user
    votes = RecommendationVote.objects.filter(
        recommendation_id__in=recommendation_ids
    ).select_related('user')

    vote_map = {}
    for vote in votes:
        vote_map.setdefault(vote.recommendation_id, []).append({
            "user_id": vote.user_id,
            "username": vote.user.username,
            "vote": vote.value,
        })

    # Format output
    rec_data = []
    for rec in recommendations:
        rec_data.append({
            "id": rec.id,
            "movie_id": rec.movie_id,
            "movie_title": rec.movie_title,
            "date_suggested": rec.date_suggested.isoformat(),
            "votes": vote_map.get(rec.id, [])
        })

    return JsonResponse({"recommendations": rec_data})



    







