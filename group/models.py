from django.db import models
from user.models import User


#Group ORM
#user.led_groups.all() Returns all groups led by a user
class Group(models.Model):
    #group_id is explicitly declared as the primary key
    group_id = models.OneToOneField(
        User, 
        on_delete=models.CASCADE,
        db_column = 'group_id', 
        primary_key=True, 
        related_name='group'  # Allows reverse lookup for the group associated with a user
    )

    #leader_id is a foreign key referencing the User table
    leader = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        db_column = 'leader_id', 
        related_name='led_groups'  # Helps in reverse lookup for groups led by the user
    )

    #Group name
    group_name = models.CharField(max_length=255)

    genre = models.CharField(max_length=100, blank=True, null=True)

    voting_limit = models.IntegerField(null=True, blank=True, default=None)  # New field

    date_created = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Group'  # Explicitly sets the table name to match your database

    def __str__(self):
        return self.group_name  # String representation of the group
    

#Group Member ORM 
#Tracks which group each user is a part of 
class GroupMember(models.Model):
    
    id = models.AutoField(primary_key=True)

    # Foreign key to the Group table
    group = models.ForeignKey(
        Group, 
        on_delete=models.CASCADE, 
        db_column = 'group_id', 
        related_name='members'
    )

    # Foreign key to the User table
    member = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        db_column = 'member_id', 

        related_name='group_memberships'  #Allows reverse lookup, e.g., user.group_memberships.all()
    )

    
    ROLE_CHOICES = [
        ('member', 'Member'),
        ('admin', 'Admin'),
    ]
    role = models.CharField(
        max_length=10, 
        choices=ROLE_CHOICES, 
        db_column = 'role', 
        default='member'
    )

    
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'GroupMember' 
        unique_together = ('group', 'member') 

    def __str__(self):
        return f"{self.member.username} in {self.group.group_name} ({self.role})"