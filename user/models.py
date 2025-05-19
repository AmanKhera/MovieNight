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
    username = models.CharField(max_length=150) 
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
        related_name='following'  
    )
    following = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='followers'  
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'relationships'
        unique_together = ('follower', 'following') 

    def __str__(self):
        return f"{self.follower.name} follows {self.following.name}"
    

class MemberRecommendation(models.Model):
    member_suggested = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='suggested_recommendations', 
        db_column='member_suggested'
    )  #the member who suggested the movie

    user_receiving = models.ForeignKey(
        User,
        on_delete=models.CASCADE, 
        related_name='received_recommendations', 
        db_column='user_receiving'
    )  
    
    movie_id = models.IntegerField()  
    date_suggested = models.DateTimeField(auto_now_add=True)  
    recommended = models.SmallIntegerField(
        choices=[
            (-1, "Rejected"),   
            ( 0, "Pending"),    
            ( 1, "Accepted"),   
        ],
        default=0
    )

    class Meta:
        db_table = 'MemberRecommendations' 

    def __str__(self):
        return f"Recommendation of movie {self.movie_id} from {self.member_suggested} to {self.user_receiving}"


class Message(models.Model):
    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('read', 'Read'),
    ]

    user_sending = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='sent_messages',
        db_column='user_sending'
    )
    user_receiving = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='received_messages',
        db_column='user_receiving'
    )
    message_content = models.TextField()
    date_sent = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=10, 
        choices=STATUS_CHOICES, 
        default='sent'
    )

    class Meta:
        db_table = 'messages' # links to correct table in mysql

    def __str__(self):
        return f"Message from {self.user_sending} to {self.user_receiving} - {self.status}"



# class MemberRecommendation(models.Model):
#     member_suggested = models.ForeignKey(
#         User, on_delete=models.CASCADE, related_name='suggested_recommendations', db_column='member_suggested'
#     )  #the member who suggested the movie
#     user_receiving = models.ForeignKey(
#         User, on_delete=models.CASCADE, related_name='received_recommendations', db_column='user_receiving'
#     )  #The user receiving the recommendation
#     movie_id = models.IntegerField()  #Movie ID column
#     voting = models.IntegerField(default=0, blank=True) 
#     date_suggested = models.DateTimeField(auto_now_add=True)  #Auto timestamp on creation
#     recommended = models.BooleanField(default=False)  #True if accepted, False otherwise

#     class Meta:
#         db_table = 'MemberRecommendations' # links to correct table in mysql

#     def str(self):
#         return f"Recommendation of movie {self.movie_id} from {self.member_suggested} to {self.user_receiving}"

class BlockList(models.Model):
    blocker = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name="blocked_users"  # Users that this user has blocked
    )
    blocked = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name="blocked_by"  # Users who have blocked this user
    )
    date_blocked = models.DateTimeField(auto_now_add=True)  # Timestamp

    class Meta:
        db_table = 'block_list'
        unique_together = ('blocker', 'blocked')  # Prevent duplicate block entries

    def __str__(self):
        return f"{self.blocker.name} blocked {self.blocked.name}"
    



class RecommendationVote(models.Model):
    UP_VOTE = 1
    DOWN_VOTE = -1
    VOTE_CHOICES = [
        (UP_VOTE,   "Upvote"),
        (DOWN_VOTE, "Downvote"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="recommendation_votes"
    )
    recommendation = models.ForeignKey(
        "MemberRecommendation",
        on_delete=models.CASCADE,
        related_name="votes"
    )
    value = models.SmallIntegerField(
        choices=VOTE_CHOICES,
        help_text="+1 = upvote, -1 = downvote"
    )
    voted_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp of the last vote or change"
    )

    class Meta:
        db_table = "RecommendationVotes"
        unique_together = ("user", "recommendation")
        constraints = [
            models.CheckConstraint(
                check=models.Q(value__in=[1, -1]),
                name="recommendationvote_value_valid"
            )
        ]

    def __str__(self):
        verb = "upvoted" if self.value == self.UP_VOTE else "downvoted"
        return f"{self.user} {verb} recommendation #{self.recommendation_id}"
