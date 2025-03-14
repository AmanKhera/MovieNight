import json
from django.test import TestCase, Client
from django.urls import reverse
from movie.models import Movie
from user.models import User

class MovieViewTests(TestCase):

    def setUp(self):
        """Set up test data"""
        self.client = Client()
        self.user = User.objects.create(name="TestUser", email="test@example.com", username="testuser")

        self.movie = Movie.objects.create(
            title="Inception", year=2010, runtime=148, rating="PG-13",
            plot="A mind-bending thriller.", director="Christopher Nolan"
        )

    ## 🔹 TEST VIEWS ##

    def test_movie_poster_view(self):
        """Test fetching a movie poster"""
        response = self.client.get(reverse('movie_poster'), {'title': 'Inception'})
        self.assertEqual(response.status_code, 200)

    def test_popular_movies_view(self):
        """Test fetching popular movies"""
        response = self.client.get(reverse('popular_movies'))
        self.assertEqual(response.status_code, 200)

    def test_search_movies_view(self):
        """Test searching for a movie"""
        response = self.client.get(reverse('search'), {'q': 'Inception'})
        self.assertEqual(response.status_code, 200)
        self.assertIn("movies", response.json())

    def test_search_users_view(self):
        """Test searching for a user"""
        response = self.client.get(reverse('search'), {'q': 'TestUser', 'filter': 'user'})
        self.assertEqual(response.status_code, 200)
        self.assertIn("users", response.json())

    def test_api_movie_search_view(self):
        """Test fetching movie from external API"""
        response = self.client.get(reverse('api_search'), {'title': 'Inception'})
        self.assertEqual(response.status_code, 200)

    def test_discover_movies_view(self):
        """Test discovering movies by genre"""
        response = self.client.get(reverse('discover_movies'), {'genre': 'action'})
        self.assertEqual(response.status_code, 200)

    def test_favorite_toggle(self):
        """Test favoriting/unfavoriting a movie"""
        payload = {"movie_id": self.movie.id}
        response = self.client.post(reverse('favorite'), json.dumps(payload), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Favorite", response.json())

    def test_retrieve_favorites(self):
        """Test retrieving favorite movies"""
        response = self.client.get(reverse('retrieve_favorites'))
        self.assertEqual(response.status_code, 200)
        self.assertIn("favorite_items", response.json())
