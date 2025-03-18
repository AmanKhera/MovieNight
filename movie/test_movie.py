from django.test import TestCase
import os
from django import setup

import json
import jwt
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'MovieNight.settings')  # Ensure this matches your project settings module
setup()

from movie.models import Movie