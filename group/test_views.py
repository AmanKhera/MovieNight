import json
import jwt
from django.urls import reverse
from django.test import TestCase, Client, RequestFactory
from django import setup
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'MovieNight.settings')
django.setup()

from user.models import User
from group.models import Group, GroupMember
from movie.models import Watchlist

class GroupViewsTest(TestCase):

    def setUp(self):
        #Set up test data
        self.client = Client()
        self.factory = RequestFactory()
        self.user1 = User.objects.create(name="Leader", email="leader@example.com", username = "testuser1")
        self.user2 = User.objects.create(name="Member1", email="member1@example.com", username = "testuser2")
        self.user3 = User.objects.create(name="Member2", email="member2@example.com", username = "testuser3")
        self.group1_user = User.objects.create(name="Test Group 1", email="group1@example.com", username = "group1user")
        self.group2_user = User.objects.create(name="Test Group 2", email="group2@example.com", username = "group2user")
        Watchlist.objects.create(user=self.user1, type='MAIN')
        Watchlist.objects.create(user=self.user2, type='MAIN')
        Watchlist.objects.create(user=self.user3, type='MAIN')
        
        
        self.group1 = Group.objects.create(
            group_id=self.group1_user,
            leader=self.user1,
            group_name=self.group1_user.name,
            genre="Action",
            voting_limit=3
        )
        Watchlist.objects.create(user=self.group1.group_id, type='MAIN')
        
        self.group2 = Group.objects.create(
            group_id=self.group2_user,
            leader=self.user2,
            group_name=self.group2_user.name,
            genre="Action",
            voting_limit=3
        )
        Watchlist.objects.create(user=self.group2.group_id, type='MAIN')

        GroupMember.objects.create(group=self.group1, member=self.user2, role = "member")
        TEST_SECRET = "secret"
        self.access_token = jwt.encode({"username": "testuser"}, TEST_SECRET, algorithm="HS256")
        
        #for user_info the token must have an "email" key.
        self.id_token = jwt.encode({"email": "testuser@example.com"}, TEST_SECRET, algorithm="HS256")
       

        #set session tokens.
        session = self.client.session
        session["access_token"] = self.access_token
        session["id_token"] = self.id_token
        session.save()

    def test_create_group(self):
        response = self.client.post(reverse('create_group'), json.dumps({
            "group_name": "New Group",
            "leader_id": self.user1.id,
            "genre": "Comedy"
        }), content_type="application/json")

        self.assertEqual(response.status_code, 201)
        self.assertIn("Group created successfully", response.json()["message"])

    def test_create_group_missing_fields(self):
        response = self.client.post(reverse('create_group'), json.dumps({
            "leader_id": self.user1.id
        }), content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_add_member_to_group(self):
        payload = {
            "group_id": self.group1.group_id.id,
            "user_id": self.user3.id
        }
        response = self.client.post(
            reverse('add_members'),
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("Member added", response.json().get("message", ""))

    def test_remove_member_from_group(self):
        payload = {
            "group_id": self.group1.group_id.id,
            "remove_id": self.user2.id,
            "username": self.user1.username
        }

        url = reverse('remove_member')
        response = self.client.post(
            url,
            data=json.dumps(payload),
            content_type="application/json"
        )


        self.assertEqual(response.status_code, 200)
        self.assertIn("User has been removed", response.json().get("Success", ""))

    def test_get_user_groups(self):
        response = self.client.get(reverse('get_user_groups'), {"username": self.user1.username})
        
        self.assertEqual(response.status_code, 200)

    
    # def test_leave_group(self):
    #     response = self.client.post(reverse('leave_group'), json.dumps({
    #         "user_id": self.user2.id,
    #         "group_id": self.group1.group_id.id
    #     }), content_type="application/json")

    #     self.assertEqual(response.status_code, 200)

    def test_group_recommendation(self):
        response = self.client.get(reverse('group_recommendation'), {"group_id": self.group2.group_id.id})
        self.assertEqual(response.status_code, 200)