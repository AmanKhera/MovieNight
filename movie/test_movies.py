from django.test import TestCase
import os
from django import setup

import json
import jwt
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'MovieNight.settings')  # Ensure this matches your project settings module
setup()

from movie.models import Movie


# Create your tests here.
class ViewsTestCase(TestCase):
    def test_queryset_exists(self):
        qs= Movie.objects.all();
        self.assertTrue(qs.exists())