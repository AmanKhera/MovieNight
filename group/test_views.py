from django.test import TestCase, Client
from django.urls import reverse
from user.models import User
from group.models import Group, GroupMember
import json

import os
from django import setup


import jwt
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'MovieNight.settings')  # Ensure this matches your project settings module
setup()


class GroupViewsTest(TestCase):

    def setUp(self):
        """Set up test data"""
        self.client = Client()
        self.user1 = User.objects.create(name="Leader", email="leader@example.com", username = "testuser1")
        self.user2 = User.objects.create(name="Member", email="member@example.com", username = "testuser2")
        
        self.group = Group.objects.create(
            group_id=self.user1,
            leader=self.user1,
            group_name="Test Group",
            genre="Action",
            voting_limit=3
        )

        self.group_member = GroupMember.objects.create(group=self.group, member=self.user2, role="member")

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
        response = self.client.get(reverse('add_members'), {"group_id": self.group.group_id, "member_id": self.user2.id})
        self.assertEqual(response.status_code, 200)

    def test_remove_member_from_group(self):
        """Test removing a member from a group"""
        response = self.client.post(reverse('remove_member'), json.dumps({
            "group_id": self.group.group_id.id,
            "remove_id": self.user2.id
        }), content_type="application/json")

        self.assertEqual(response.status_code, 200)
        self.assertIn("User has been removed", response.json()["Success"])

    def test_get_user_groups(self):
        """Test retrieving groups a user belongs to"""
        payload = {"username": self.user2.username}
        response = self.client.get(reverse('get_user_groups'),  data=json.dumps(payload),  content_type="application/json"  )

        print("📥 Response Status Code:", response.status_code)  # ✅ Debugging
        print("📥 Response Content:", response.json())  # ✅ Debugging

        self.assertEqual(response.status_code, 200)

    def test_leave_group(self):
        """Test leaving a group"""
        response = self.client.post(reverse('leave_group'), json.dumps({
            "user_id": self.user2.id,
            "group_id": self.group.group_id.id
        }), content_type="application/json")

        self.assertEqual(response.status_code, 200)

    def test_group_recommendation(self):
        """Test fetching group recommendations"""
        response = self.client.get(reverse('group_recommendation'), {"group_id": self.group.group_id})
        self.assertEqual(response.status_code, 200)