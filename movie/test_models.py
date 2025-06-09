from django.test import TestCase
from movie.models import Movie, Watchlist, WatchlistItem, UserMovieJournal
from user.models import User

class MovieModelTests(TestCase):

    def setUp(self):
        #Set up test data
        self.user = User.objects.create(name="TestUser", email="test@example.com", username="testuser")

        self.movie = Movie.objects.create(
            title="Inception", year=2010, runtime=148, rating="PG-13",
            plot="A mind-bending thriller.", director="Christopher Nolan"
        )

        self.watchlist = Watchlist.objects.create(user=self.user, name="Favorites", type=Watchlist.MAIN)
        self.watchlist_item = WatchlistItem.objects.create(watchlist=self.watchlist, movie=self.movie)
        self.journal_entry = UserMovieJournal.objects.create(
            user=self.user, movie=self.movie, rating=4.5, review="Great movie!", favorite=True
        )

    def test_movie_model(self):
        self.assertEqual(str(self.movie), "Inception")

    def test_watchlist_model(self):
        self.assertEqual(str(self.watchlist), "Favorites (Main)")

    def test_watchlist_item_model(self):
        self.assertEqual(str(self.watchlist_item), f"Movie {self.movie.id} in {self.watchlist.name}")

    def test_user_movie_journal_model(self):
        self.assertEqual(str(self.journal_entry), f"{self.user} - {self.movie} ({self.journal_entry.date_watched})")
