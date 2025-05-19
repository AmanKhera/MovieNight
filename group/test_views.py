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

class GroupViewsTest(TestCase):

    def setUp(self):
        """Set up test data"""
        self.client = Client()
        self.factory = RequestFactory()
        self.user1 = User.objects.create(name="Leader", email="leader@example.com", username = "testuser1")
        self.user2 = User.objects.create(name="Member1", email="member1@example.com", username = "testuser2")
        self.user3 = User.objects.create(name="Member2", email="member2@example.com", username = "testuser3")
        self.group1_user = User.objects.create(name="Test Group 1", email="group1@example.com", username = "group1user")
        self.group2_user = User.objects.create(name="Test Group 2", email="group2@example.com", username = "group2user")
        
        self.group1 = Group.objects.create(
            group_id=self.group1_user,
            leader=self.user1,
            group_name=self.group1_user.name,
            genre="Action",
            voting_limit=3
        )

        self.group2 = Group.objects.create(
            group_id=self.group2_user,
            leader=self.user2,
            group_name=self.group2_user.name,
            genre="Action",
            voting_limit=3
        )
        
        GroupMember.objects.create(group=self.group1, member=self.user2, role = "member")
        TEST_SECRET = "secret"
        #create valid JWT tokens for testing. get_user_username view expects a token payload with a "username" key.
        self.access_token = jwt.encode({"username": "testuser"}, TEST_SECRET, algorithm="HS256")
        
        #for user_info the token must have an "email" key.
        self.id_token = jwt.encode({"email": "testuser@example.com"}, TEST_SECRET, algorithm="HS256")
       

        #set session tokens.
        session = self.client.session
        session["access_token"] = self.access_token
        session["id_token"] = self.id_token
        session.save()

    def test_create_group(self):
        """Test group creation endpoint"""
        response = self.client.post(reverse('create_group'), json.dumps({
            "group_name": "New Group",
            "leader_id": self.user1.id,
            "genre": "Comedy"
        }), content_type="application/json")

        self.assertEqual(response.status_code, 201)
        self.assertIn("Group created successfully", response.json()["message"])

    def test_create_group_missing_fields(self):
        """Test group creation with missing fields"""
        response = self.client.post(reverse('create_group'), json.dumps({
            "leader_id": self.user1.id
        }), content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_add_member_to_group(self):
        """Test adding a member to a group"""
        response = self.client.get(
            reverse('add_members'),  # 👈 Ensure 'add_members' is correctly tied to the view
            {"group_id": self.group1.group_id.id, "username": self.user2.username}
        )
        print("📥 Response Status Code:", response.status_code)
        print("📥 Response Content:", response.json())
        print("🔁 Resolved URL:", reverse('add_members'))
        self.assertEqual(response.status_code, 200)
        self.assertIn("Member added", response.json().get("message", ""))

    def test_remove_member_from_group(self):
        """Test removing a member from a group"""
        payload = {
            "group_id": self.group1.group_id.id,  # group_id is a OneToOneField to User
            "remove_id": self.user2.id
        }

        url = reverse('remove_member') + f"?username={self.user1.username}"  # add query param
        response = self.client.post(
            url,
            data=json.dumps(payload),
            content_type="application/json"
        )

        print("📥 Response Status Code:", response.status_code)
        print("📥 Response Content:", response.json())

        self.assertEqual(response.status_code, 200)
        self.assertIn("User has been removed", response.json().get("Success", ""))

    def test_get_user_groups(self):
        """Test retrieving groups a user belongs to"""
        response = self.client.get(reverse('get_user_groups'), {"username": self.user1.username})
        
        print("📥 Response Status Code:", response.status_code)  # ✅ Debugging
        print("📥 Response Content:", response.json())  # ✅ Debugging

        self.assertEqual(response.status_code, 200)

    
    def test_leave_group(self):
        """Test leaving a group"""
        response = self.client.post(reverse('leave_group'), json.dumps({
            "user_id": self.user2.id,
            "group_id": self.group1.group_id.id
        }), content_type="application/json")

        print("📥 Response Status Code:", response.status_code)  # ✅ Debugging
        print("📥 Response Content:", response.json())  # ✅ Debugging

        self.assertEqual(response.status_code, 200)

    def test_group_recommendation(self):
        """Test fetching group recommendations"""
        response = self.client.get(reverse('group_recommendation'), {"group_id": self.group2.group_id.id})
        print("📥 Response Status Code:", response.status_code)  # ✅ Debugging
        print("📥 Response Content:", response.json())  # ✅ Debugging
        self.assertEqual(response.status_code, 200)