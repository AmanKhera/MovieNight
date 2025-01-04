from django.shortcuts import render
from django.http import JsonResponse
from user.models import User
from group.models import Group, GroupMembers
import json


def create_group(request):

    if request.method != 'GET':
        return JsonResponse({'error': 'Invalid request method'}, status=405)


    try:   
        group_name = request.GET.get("group_name")
        leader_id = request.GET.get("leader_id")
        genre = request.GET.get("genre", None)

        user = User.objects.get(id=leader_id)

        if Group.objects.filter(leader_id = user.id, group_name = group_name).exists():
           return JsonResponse({'message': 'Group name cannot be the same as existing group'}, status=200)            

        Group.objects.create(leader_id = user.id, group_name = group_name, genre = genre)
        User.objects.create(name = group_name)

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

        if GroupMembers.objects.filter(group_id=group_id, member_id=member_id):
           return JsonResponse({'message': 'Members is already a part of this group'}, status=200)

        GroupMembers.objects.create(group_id=group_id, member_id=member_id)

        return JsonResponse({'message': 'Member added to group!'})

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON input'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    

def add_to_group_watchlist(request):
    pass

