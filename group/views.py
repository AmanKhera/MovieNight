from django.shortcuts import render
from django.http import JsonResponse
from user.models import User, MemberRecommendation
from group.models import Group, GroupMember
from movie.models import Watchlist, WatchlistItem
import json
from user.views import get_user_username, create_watchlist
from django.views.decorators.csrf import csrf_exempt

#Create Group
#Params: group_name, leader_id, genre
#return: Status 200 if success


import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.exceptions import ObjectDoesNotExist
from .models import User, Group, GroupMember

#@csrf_exempt  # Temporarily disable CSRF for testing (remove in production)


import logging
logger = logging.getLogger(__name__)


@csrf_exempt
def create_group(request):
    logger.info(f"CSRF token from cookie: {request.META.get('CSRF_COOKIE')}")
    logger.info(f"CSRF token from headers: {request.META.get('HTTP_X_CSRFTOKEN')}")
    print("--------------------")
    print(f"CSRF token from cookie: {request.META.get('CSRF_COOKIE')}")
    print(f"CSRF token from headers: {request.META.get('HTTP_X_CSRFTOKEN')}")
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

    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        group_id = data.get("group_id")
        member_id = data.get("member_id")

        group = Group.objects.get(group_id=group_id)
        member = User.objects.get(id = member_id)

        if GroupMember.objects.filter(group=group_id, member=member_id):
           return JsonResponse({'message': 'Members is already a part of this group'}, status=200)

        GroupMember.objects.create(group=group, member=member)

        return JsonResponse({'message': 'Member added to group!'}, status = 200)

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
        id = (User.objects.get(name=username)).id #needed to make sure leader is the 1 removing members
        member_to_be_removed_id = data.get('remove_id')
        group_id = data.get("group_id")
        group = Group.objects.filter(group_id = group_id)

        if group.leader_id == id:
            GroupMember.objects.filter(group_id = group_id, member_id = member_to_be_removed_id).delete()
            return JsonResponse({"Success": "User has been removed from the group"}, status = 200)
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
        user = (User.objects.get(name=username)) #needed to grab users groups
        
        #grabs a list of all groups the user is a part of via reverse lookup
        groups = list(user.group_memberships.all())

        #serializes list to allow for json response
        groups = [
            {
                "group_id": membership.group_id,
                "group_name": membership.group.group_name,
                "role": membership.role,
                "joined_at": membership.joined_at,
            }
            for membership in groups
        ]

        return JsonResponse({"groups": groups}, status=200)

    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    

#Group Recommendation
#Params: group_id
#Returns: Movies recommended to group are returned as a list
def group_recommendation(request):

    group_id = request.GET.get('group_id')
    try:
        recommendations = MemberRecommendation.objects.filter(user_receiving = group_id)
        #turn in to list to return as JsonResponse
        recommendations_list = list(recommendations.values())
        return JsonResponse({"Recommendations": recommendations_list})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status = 500)

    



