from django.test import TestCase
from user.models import User
from group.models import Group, GroupMember

import os
from django import setup

import json
import jwt
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'MovieNight.settings')  # Ensure this matches your project settings module
setup()


class GroupModelTest(TestCase):

    def setUp(self):
        """Set up test data"""
        self.user1 = User.objects.create(name="Leader", email="leader@example.com")
        self.user2 = User.objects.create(name="Member", email="member@example.com")

        # Create a group with a leader
        self.group = Group.objects.create(
            group_id=self.user1,  # OneToOneField requires an existing User
            leader=self.user1,
            group_name="Test Group",
            genre="Action",
            voting_limit=3
        )

    def test_group_creation(self):
        """Test if the group is created successfully"""
        self.assertEqual(self.group.group_name, "Test Group")
        self.assertEqual(self.group.leader, self.user1)
        self.assertEqual(self.group.genre, "Action")

    def test_group_member_creation(self):
        """Test if a user can be added as a group member"""
        membership = GroupMember.objects.create(group=self.group, member=self.user2, role='member')
        self.assertEqual(membership.group, self.group)
        self.assertEqual(membership.member, self.user2)
        self.assertEqual(membership.role, 'member')

    def test_group_string_representation(self):
        """Test group string representation"""
        self.assertEqual(str(self.group), "Test Group")

class GroupMemberModelTest(TestCase):

    def setUp(self):
        self.user = User.objects.create(name="TestUser", email="test@example.com")
        self.group = Group.objects.create(group_id=self.user, leader=self.user, group_name="Fun Group", voting_limit = 3)
        self.group_member = GroupMember.objects.create(group=self.group, member=self.user, role="admin")

    def test_group_member_str(self):
        """Test string representation"""
        self.assertEqual(str(self.group_member), f"{self.user.username} in {self.group.group_name} (admin)")