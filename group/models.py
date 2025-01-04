from django.db import models
from user.models import User


#Group ORM
#user.led_groups.all() Returns all groups led by a user
class Group(models.Model):
    group_id = models.AutoField(primary_key=True)
    leader = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='led_groups'
    )

    id = models.ForeignKey(  # Foreign key referencing `User.id`
        User, 
        on_delete=models.CASCADE, 
        related_name='group_members'
    )
    group_name = models.CharField(max_length=255)
    genre = models.CharField(max_length=100, blank=True, null=True) 
    date_created = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Group'

    def __str__(self):
        return self.group_name
    

#Group Member ORM 
#Tracks which group each user is a part of 
class GroupMembers(models.Model):
    ROLE_CHOICES = [
        ('member', 'Member'),
        ('admin', 'Admin'),
    ]

    id = models.AutoField(primary_key=True)  
    group = models.ForeignKey(
        Group, 
        on_delete=models.CASCADE, 
        related_name='members'
    )
    member = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='group_memberships'
    )
    role = models.CharField(
        max_length=10, 
        choices=ROLE_CHOICES, 
        default='member'
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('group', 'member')
        db_table = 'GroupMembers'

    def __str__(self):
        return f"{self.member.username} in {self.group.group_name} ({self.role})"
