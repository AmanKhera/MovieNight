from django.shortcuts import render
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
    if request.method != 'GET':
        return JsonResponse({'error': 'Invalid request method'}, status=405)
    
    try:
        group_id = request.GET.get("group_id")
        member_id = request.GET.get("member_id")

        group = Group.objects.get(group_id=group_id)
        member = User.objects.get(id=member_id)

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
        username = get_user_username(request.session.get("access_token")).get('username')
        current_user_id = User.objects.get(name=username).id  # Ensure leader is the one removing members
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
        username = get_user_username(request.session.get("access_token")).get('username')
        user = User.objects.get(name=username)
        
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
        recommendations = MemberRecommendation.objects.filter(user_receiving=group_id)
        recommendations_list = list(recommendations.values())
        return JsonResponse({"Recommendations": recommendations_list})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
