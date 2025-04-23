from django.shortcuts import render
from user.models import Message
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.exceptions import ObjectDoesNotExist
import json
import logging


from user.models import User
from group.models import Group, GroupMember
from movie.models import Watchlist, WatchlistItem
from user.views import get_user_username, create_watchlist
from user.models import MemberRecommendation
# If MemberRecommendation is used, import it:
# from user.models import MemberRecommendation  (or wherever it is defined)


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

        # Validate required fields
        if not group_name or not leader_id:
            return JsonResponse({'error': 'Missing required fields'}, status=400)

        # Fetch the user
        try:
            user = User.objects.get(id=leader_id)
        except ObjectDoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)

        # Check for duplicate group names
        if Group.objects.filter(leader_id=user, group_name=group_name).exists():
            return JsonResponse({'error': 'Group name already exists'}, status=400)

        # Create the group
        New_Group = User.objects.create(
            name=group_name,
            email=f"{group_name.replace(' ', '_').lower()}_{user.id}@group.local"
        )

        watchlist = Watchlist.objects.create(user_id=New_Group.id)

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
    #if request.method != 'GET':
    #    return JsonResponse({'error': 'Invalid request method'}, status=405)
    
    try:
        group_id = request.GET.get("group_id")
        username = request.GET.get("username")

        group = Group.objects.get(group_id=group_id)
        member = User.objects.get(username=username)

        if GroupMember.objects.filter(group=group, member=member).exists():
            return JsonResponse({'message': 'Member is already a part of this group'}, status=200)

        GroupMember.objects.create(group=group, member=member)
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
        username = request.GET.get("username")
        current_user_id = User.objects.get(username=username).id  # Ensure leader is the one removing members
        member_to_be_removed_id = data.get('remove_id')
        group_id = data.get("group_id")

        # Use get to retrieve a single group instance
        group = Group.objects.get(group_id=group_id)

        if group.leader_id == current_user_id:
            GroupMember.objects.filter(group=group, member_id=member_to_be_removed_id).delete()
            return JsonResponse({"Success": "User has been removed from the group"}, status=200)
        else:
            return JsonResponse({"error": "Not authorized to remove member"}, status=403)
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
    

def group_recommendation(request):
    group_id = request.GET.get('group_id')
    try:
        recommendations = MemberRecommendation.objects.filter(user_receiving=group_id).order_by('-voting')
        recommendations_list = list(recommendations.values())
        return JsonResponse({"Recommendations": recommendations_list})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    

@csrf_exempt
def leave_group(request):

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_id = data.get('user_id')
            group_id = data.get('group_id')

            group = Group.objects.get(group_id=group_id)

            membership = GroupMember.objects.get(group=group, member_id=user_id)
            membership.delete()

            return JsonResponse({"message": "User has left the group"}, status=200)

        except GroupMember.DoesNotExist:
            return JsonResponse({"error": "User is not in group"}, status=500)
        except Group.DoesNotExist:
            return JsonResponse({"error": "Group not found"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Invalid request method"}, status=405)
        
        
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


#Update Recommendation
#params: Requires post request,
#recommendation_id: row id of the recommendation which can be grabbed via group_recommedation method (universal function not just for groups)
#like: True or False
#returns: Dictionary which contains "Recommendation" if true add movie to watchlist otherwise do nothing
#
@csrf_exempt
def update_recommendation(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            recommendation_id = data.get("recommendation_id")
            like = data.get('like')
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON format."}, status=400)

        if MemberRecommendation.objects.filter(id = recommendation_id).exists():
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

        if Group.objects.filter(group_id = user_rec.id).exists():

            group = Group.objects.get(group_id = user_rec.id)
            voting_limit = group.voting_limit
            #convert to decimal and divide by # of group members
            if recommendation.voting >= voting_limit:
                return JsonResponse({"Recommendation": True})
            else:
                return JsonResponse({"Recommendation": False})
#         # elif User.objects.filter(id = user_rec.id):
#         #     if recommendation.voting == 1:
#         #         return JsonResponse({"Recommendation": True})
#         #     else:
#         #         return JsonResponse({"Recommendation": False})

        else:
            return JsonResponse({"error": "Recieving user does not exist "})