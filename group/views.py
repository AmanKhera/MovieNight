from django.shortcuts import render
from django.http import JsonResponse
from user.models import User
from group.models import Group, GroupMember
from movie.models import Watchlist, WatchlistItem
import json
from user.views import get_user_username, create_watchlist


def create_group(request):

    if request.method != 'GET':
        return JsonResponse({'error': 'Invalid request method'}, status=405)


    try:   
        group_name = request.GET.get("group_name")
        leader_id = request.GET.get("leader_id")
        genre = request.GET.get("genre", None)

        user = User.objects.get(id=leader_id)

        if Group.objects.filter(leader_id = user, group_name = group_name).exists():
           return JsonResponse({'message': 'Group name cannot be the same as existing group'}, status=200)            
        
        #unique email is needed since the user table must be unique
        New_Group = User.objects.create(name = group_name, email=f"{group_name.replace(' ','_').lower()}_{user.id}@group.local")
        Group_ = Group.objects.create(group_id = New_Group, leader_id = user.id, group_name = group_name, genre = genre)        
        GroupMember.objects.create(group = Group_,member = user, role = 'admin')
        return JsonResponse({'message': 'Group was Successfully created'})

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON input'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    

def add_member_to_group(request):

    if request.method != 'GET':
        return JsonResponse({'error': 'Invalid request method'}, status=405)
    
    try:
        group_id = request.GET.get("group_id")
        member_id = request.GET.get("member_id")

        group = Group.objects.get(group_id=group_id)
        member = User.objects.get(id = member_id)

        if GroupMember.objects.filter(group=group_id, member=member_id):
           return JsonResponse({'message': 'Members is already a part of this group'}, status=200)

        GroupMember.objects.create(group=group, member=member)

        return JsonResponse({'message': 'Member added to group!'})

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON input'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    

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
    
def add_to_group_watchlist(request):
    pass



