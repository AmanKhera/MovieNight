from django.db import models
from user.models import User

# Create your models here.

class Movie(models.Model):
    title = models.CharField(max_length=255)
    year = models.IntegerField()
    runtime = models.IntegerField()
    rating = models.CharField(max_length=10)
    plot = models.TextField(blank=True, null=True)
    director = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'movie_movie'


#Watchlist Table
#contains all of users watchlists
#   user_watchlists = Watchlist.objects.filter(user=user)
#   retrieves all user watchlists

class Watchlist(models.Model):
    MAIN = 'main'
    CUSTOM = 'custom'

    #type can only be main or custom
    WATCHLIST_TYPE_CHOICES = [
        (MAIN, 'Main'),
        (CUSTOM, 'Custom'),
    ]

    id = models.BigAutoField(primary_key=True) 

    #links user to watchlist
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='watchlists') 

    #default name is watchlist so does not need to be edited unless custom
    name = models.CharField(max_length=255, default='Watchlist')
    #type must be main or custom
    type = models.CharField(max_length=10, choices=WATCHLIST_TYPE_CHOICES, default=MAIN)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        #only allows 1 main playlist 
        unique_together = ('user', 'type')

    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"
    


#WatchListItem Table
#contains items within playlist
class WatchlistItem(models.Model):
    id = models.BigAutoField(primary_key=True)

    #links item to specific watchlist
    watchlist = models.ForeignKey(Watchlist, on_delete=models.CASCADE, related_name='items')
    
    #links to movie
    movie = models.ForeignKey('movie.Movie', on_delete=models.CASCADE, related_name='watchlist_items')
    added_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Movie {self.movie_id} in {self.watchlist.name}"   

