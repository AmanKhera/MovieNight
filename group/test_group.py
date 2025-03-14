from django.test import TestCase, Client
from django.urls import reverse
import os
from django import setup

import json
import jwt
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'MovieNight.settings')  # Ensure this matches your project settings module
setup()

from group.models import Group,GroupMember
from user.models import User