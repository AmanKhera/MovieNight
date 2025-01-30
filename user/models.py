from django.db import models

#User table
#Users are added to the table when they sign up for webapp
#   retrieving user via name
#   user = User.objects.get(name=user_name)
#   user_id = user.id
class User(models.Model):
    id = models.AutoField(primary_key=True)  
    name = models.CharField(max_length=100)  
    email = models.EmailField(unique=True)   
    date_joined = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.id}: {self.name}"  #Returns the name of the user when the object is printed
    class Meta:
        db_table = 'users'



#Relationship table
#Store user relationships which can be follower or friend
class Relationship(models.Model):
    follower = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='following'  # Users this user is following
    )
    following = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='followers'  # Users following this user
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'relationships'  # Link to 'relationships' table in MySQL
        unique_together = ('follower', 'following')  # Prevent duplicate relationships

    def __str__(self):
        return f"{self.follower.name} follows {self.following.name}"

class MemberRecommendation(models.Model):
    member_suggested = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='suggested_recommendations'
    )  #the member who suggested the movie
    user_receiving = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='received_recommendations'
    )  #The user receiving the recommendation
    movie_id = models.IntegerField()  #Movie ID column
    voting = models.IntegerField(null=True, blank=True)  #Voting column, can be null
    date_suggested = models.DateTimeField(auto_now_add=True)  #Auto timestamp on creation
    recommended = models.BooleanField(default=False)  #True if accepted, False otherwise

    def str(self):
        return f"Recommendation of movie {self.movie_id} from {self.member_suggested} to {self.user_receiving}"