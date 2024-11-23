from django.db import models

class Movie(models.Model):
    title = models.CharField(max_length=255)
    year = models.IntegerField()
    runtime = models.IntegerField()
    rating = models.CharField(max_length=10)
    plot = models.CharField(max_length=500, blank=True, null=True)

    def __str__(self):
        return self.title