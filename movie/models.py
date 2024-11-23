from django.db import models


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
