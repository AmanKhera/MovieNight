from django.db import models


#User table
#Users are added to the table when they sign up for webapp
#Contains id (Primary Key), name, email, username, date_joined, is_online, last_seen
class User(models.Model):
    id = models.AutoField(primary_key=True)  
    name = models.CharField(max_length=100)  
    email = models.EmailField(unique=True)   
    username = models.CharField(max_length=150) 
    date_joined = models.DateTimeField(auto_now_add=True)
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.id}: {self.name}"  #Returns the name of the user when the object is printed
    class Meta:
        db_table = 'users'



#Relationship table
#Store user relationships which can be follower or friend, and the time the relationship was created
#Restrictions: A follower cannot follower the same user twice
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



#Member Recommendation Table
#When a user sends a movie to another user the information is stored in this table
#Table tracks member who suggested movie (member_suggested), user recieving recommendation (user_receiving), movie_id, date_suggested, 
#recommended: Tracks whether or not the recommendation has been accepted, rejected or is pending
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



#Message Table
#Stores messages between users
#Table tracks: user_sending, user_receiving (could also be group), message_content, date_sent, status which by default is sent
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
        db_table = 'messages'

    def __str__(self):
        return f"Message from {self.user_sending} to {self.user_receiving} - {self.status}"



#BlockList Table
#Table Columns: blocker (User blocking), blocked (User being blocked), date_blocked
#Table Restrictions: blocker cannot block the same person twice
class BlockList(models.Model):
    blocker = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name="blocked_users"  #Users that this user has blocked
    )
    blocked = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name="blocked_by"  #Users who have blocked this user
    )
    date_blocked = models.DateTimeField(auto_now_add=True) 

    class Meta:
        db_table = 'block_list'
        unique_together = ('blocker', 'blocked')

    def __str__(self):
        return f"{self.blocker.name} blocked {self.blocked.name}"
    


#RecommedationVote
#Tracks user votes on recommendations 
#Table Columns: user: user as foreign key, recommendation: foreign key from MemberRecommendation table,
#Value: 1 (upvote) or -1 (downvote), voted_at: When the user voted
#Table Restrictions: A user can only vote onces per recommendation (vote can be changed),
#value must be 1 or -1
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
    




#User Event Proposal
#Allows users to create movie events 
#Table Columns: proposed_by: User table foreign key, recipient: User (User table foreign key) recieving event,
#movie: movie being proposed (movie table foreign key), proposed_datetime: date and time of event
#created_at: when the event was created, status: Used to determine if event has been selected
#Table restrictions: A user can propose one movie at the specific proposed_datetime
class UserEventProposal(models.Model):
    STATUS_CHOICES = [
        (0, 'Pending'),
        (1, 'Accepted'),
        (-1, 'Rejected'),
    ]

    proposed_by = models.ForeignKey(
        User, on_delete=models.CASCADE,
        db_column='proposed_by',
        related_name='proposals_sent'
    )

    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='proposals_received'
    )

    movie = models.ForeignKey('movie.Movie', on_delete=models.CASCADE)

    proposed_datetime = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.SmallIntegerField(choices=STATUS_CHOICES, default=0)

    class Meta:
        db_table = 'user_event_proposal'
        unique_together = ('recipient', 'movie', 'proposed_datetime')

    def __str__(self):
        return f"{self.proposed_by.username} → {self.recipient.username} for {self.movie.title}"



#User Event Vote
#Table Columns: proposal: foriegn key from UserEventProposal, user: user who is voting (foreign key from User table),
#vote: True or False, voted_at: time the user voted
#Table restrictions: A user can only vote once per an event
class UserEventVote(models.Model):
    proposal = models.ForeignKey(UserEventProposal, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    vote = models.BooleanField(null=True) 
    voted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_event_vote'
        unique_together = ('proposal', 'user')

    def __str__(self):
        return f"{self.user.username} voted for proposal {self.proposal.id}"

