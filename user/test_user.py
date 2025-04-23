import json
import jwt
from django.urls import reverse
from django.test import TestCase, Client, RequestFactory
from django import setup
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "MovieNight.settings")
django.setup()

#import models
from user.models import User, Relationship, MemberRecommendation, Message, BlockList
from movie.models import Watchlist, WatchlistItem, UserMovieJournal, Movie
from group.models import Group, GroupMember

#make sure this matches project settings module
# os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'MovieNight.settings')  
# setup()


#dummy secret used to encode tokens for testing.
TEST_SECRET = "secret"

class ViewsTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.factory = RequestFactory()

        # Create sample users.
        self.user1 = User.objects.create(name="testuser", email="testuser@example.com")
        self.user2 = User.objects.create(name="otheruser", email="otheruser@example.com")
        self.user3 = User.objects.create(name="thirduser", email="thirduser@example.com")
        self.group1_user = User.objects.create(name="Test Group 1", email="group1@example.com", username = "group1user")
        self.group2_user = User.objects.create(name="Test Group 2", email="group2@example.com", username = "group2user")
        
        self.group1 = Group.objects.create(
            group_id=self.group1_user,
            leader=self.user1,
            group_name=self.group1_user.name,
            genre="Action",
            voting_limit=3
        )

        self.group2 = Group.objects.create(
            group_id=self.group2_user,
            leader=self.user2,
            group_name=self.group2_user.name,
            genre="Horror",
            voting_limit=3
        )

        Watchlist.objects.filter(user_id=self.user1.id).delete()
        Watchlist.objects.filter(user_id=self.user2.id).delete()
        Watchlist.objects.filter(user_id=self.user3.id).delete()


        #dummy movie.
        self.movie = Movie.objects.create(
            title="Inception",
            year=2010,       
            runtime=120,     
            rating=8.5       
        )

        #create default watchlist for user1.
        self.watchlist = Watchlist.objects.create(
            user_id=self.user1.id,
            name="Watchlist",
            type=Watchlist.MAIN
        )

        
        #create valid JWT tokens for testing. get_user_username view expects a token payload with a "username" key.
        self.access_token = jwt.encode({"username": "testuser"}, TEST_SECRET, algorithm="HS256")
        
        #for user_info the token must have an "email" key.
        self.id_token = jwt.encode({"email": "testuser@example.com"}, TEST_SECRET, algorithm="HS256")

        #set session tokens.
        session = self.client.session
        session["access_token"] = self.access_token
        session["id_token"] = self.id_token
        session.save()

    #tests for helper function get_user_username ---
    def test_get_user_username_valid(self):
        # Import the helper directly if needed:
        from user.views import get_user_username
        result = get_user_username(self.access_token)
        self.assertIsInstance(result, dict)
        self.assertEqual(result.get("username"), "testuser")

    def test_get_user_username_missing(self):
        from user.views import get_user_username
        result = get_user_username(None)
        self.assertEqual(result.status_code, 401)

    
    
    #tests for create_watchlist
    def test_create_watchlist_with_id(self):

        #make sure there are no existing watchlists before running the test
        Watchlist.objects.filter(user_id=self.user1.id).delete()

        #create the first watchlist (should succeed)
        response = self.client.post(reverse('watchlist'), {'id': self.user1.id, 'name': 'Watchlist'})
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 200)  # Expect success
        self.assertTrue(data.get("success"))

        #try creating a second watchlist (should fail)
        response = self.client.post(reverse('watchlist'), {'id': self.user1.id, 'name': 'Watchlist'})
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 400)  # Expect failure
        self.assertIn("A main watchlist already exists", data.get("message"))

    def test_create_watchlist_with_session_token(self):
        #when no 'id' is provided the view uses the session token.
        url = "/watchlist/?name=CustomList"
        response = self.client.get(url)
        data = json.loads(response.content)
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("data", {}).get("name"), "CustomList")
        #since name is not "Watchlist", the type should be CUSTOM.
        self.assertEqual(data.get("data", {}).get("type"), Watchlist.CUSTOM)

    def test_create_watchlist_duplicate_main(self):
        #user1 already has a main watchlist from setUp.
        url = "/watchlist/?name=Watchlist"
        response = self.client.get(url)
        data = json.loads(response.content)
        self.assertFalse(data.get("success"))
        self.assertIn("already exists", data.get("message", "").lower())

    def test_create_watchlist_invalid_method(self):
        response = self.client.put("/watchlist/")
        self.assertEqual(response.status_code, 405)

    #tests for add_movie view ---
    def test_add_movie_with_direct_id(self):
        # Create an additional watchlist for testing.
        custom_watchlist = Watchlist.objects.create(
            user_id=self.user1.id,
            name="CustomList",
            type=Watchlist.CUSTOM
        )
        url = "/add_movie/?movie_id={}&watchlist_name=CustomList&id={}".format(
            self.movie.id, self.user1.id
        )
        response = self.client.get(url)
        data = json.loads(response.content)
        self.assertTrue(data.get("success"))
        # Verify the WatchlistItem was created.
        self.assertTrue(WatchlistItem.objects.filter(
            watchlist=custom_watchlist,
            movie_id=self.movie.id
        ).exists())

    def test_add_movie_with_session_token(self):
        url = "/add_movie/?movie_id={}&watchlist_name=Watchlist".format(self.movie.id)
        response = self.client.get(url)
        data = json.loads(response.content)
        self.assertIn("added", data.get("message", "").lower())
        # Try adding the same movie again to trigger the duplicate branch.
        response2 = self.client.get(url)
        data2 = json.loads(response2.content)
        self.assertIn("already", data2.get("message", "").lower())

    def test_add_movie_invalid_method(self):
        url = "/add_movie/?movie_id={}".format(self.movie.id)
        response = self.client.post(url)
        self.assertEqual(response.status_code, 405)

    
    
    
    #tests for create_relationship
    def test_create_relationship_success(self):
        response = self.client.get(reverse('relationship'), {'follower_id': self.user1.id, 'following_id': self.user2.id})
        data = json.loads(response.content)

        print("Response Data:", data)

        #first call should succeed (201 Created)
        self.assertEqual(response.status_code, 201)
        self.assertIn("Relationship created successfully", data.get("message"))

        #try to create the same relationship again
        response = self.client.get(reverse('relationship'), {'follower_id': self.user1.id, 'following_id': self.user2.id})
        data = json.loads(response.content)

        print("Response Data (Duplicate Attempt):", data)

        #should return "already exists"
        self.assertEqual(response.status_code, 200)
        self.assertIn("Relationship removed", data.get("message"))

    
    
    
    def test_create_relationship_same_user(self):
        url = "/create_relationship/?follower_id={}&following_id={}".format(
            self.user1.id, self.user1.id
        )
        response = self.client.get(url)
        self.assertEqual(response.status_code, 400)

    def test_create_relationship_nonexistent_user(self):
        url = "/create_relationship/?follower_id={}&following_id=9999".format(self.user1.id)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

    
    
    #test for get_followers
    def test_get_followers(self):
        # Create a one-way relationship: user2 follows user1.
        Relationship.objects.create(follower=self.user2, following=self.user1)
        url = "/get_followers/?id={}".format(self.user1.id)
        response = self.client.get(url)
        data = json.loads(response.content)
        self.assertIn(str(self.user2.id), data)
        self.assertEqual(data[str(self.user2.id)], self.user2.name)

    #test for get_following
    def test_get_following(self):
        # Create a relationship: user1 follows user2.
        Relationship.objects.create(follower=self.user1, following=self.user2)
        url = "/get_following/?id={}".format(self.user1.id)
        response = self.client.get(url)
        data = json.loads(response.content)
        self.assertIn(str(self.user2.id), data)
        self.assertEqual(data[str(self.user2.id)], self.user2.name)

    #test for get_mutual_friends
    def test_get_mutual_friends(self):
        # Create mutual relationships between user1 and user2.
        Relationship.objects.create(follower=self.user1, following=self.user2)
        Relationship.objects.create(follower=self.user2, following=self.user1)
        url = "/get_mutual_friends/?id={}".format(self.user1.id)
        response = self.client.get(url)
        data = json.loads(response.content)
        self.assertIn(str(self.user2.id), data)
        self.assertEqual(data[str(self.user2.id)], self.user2.name)

    #tests for grab_watchlists
    def test_grab_watchlists_with_id(self):
        # Create a watchlist for user2.
        Watchlist.objects.create(
            user_id=self.user2.id,
            name="Watchlist",
            type=Watchlist.MAIN
        )
        
        url = "/grab_watchlist/?id={}".format(self.user2.id)
        response = self.client.get(url)
        data = json.loads(response.content)
        self.assertEqual(data.get("status"), "success")
        self.assertTrue(len(data.get("watchlist", [])) > 0)

    def test_grab_watchlists_with_session(self):
        url = "/grab_watchlist/"
        response = self.client.get(url)
        data = json.loads(response.content)
        self.assertEqual(data.get("status"), "success")
        self.assertTrue(len(data.get("watchlist", [])) > 0)

    #tests for grab_watchlist_items
    def test_grab_watchlist_items_success(self):
        # Create a watchlist item for user1's default watchlist.
        WatchlistItem.objects.create(
            watchlist=self.watchlist,
            movie_id=self.movie.id
        )
        # URL changed to /watchlist_items/
        url = "/watchlist_items/?watchlist_name=Watchlist"
        response = self.client.get(url)
        data = json.loads(response.content)
        self.assertEqual(data.get("status"), "success")
        # Verify that the item list contains the movie.
        items = data.get("watchlist", [])
        self.assertTrue(any(item.get("movie_id") == self.movie.id for item in items))

    def test_grab_watchlist_items_nonexistent(self):
        url = "/watchlist_items/?watchlist_name=Nonexistent"
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

    #tests for add_to_watched
    def test_add_to_watched_create(self):
        payload = {
            "user_id": self.user1.id,
            "movie_id": self.movie.id,
            "rating": 4,
            "review": "Good movie"
        }
        url = "/add_to_watched/"
        response = self.client.post(url, data=json.dumps(payload), content_type="application/json")
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.content)
        self.assertIn("Movie added", data.get("message", ""))

    def test_add_to_watched_update(self):
        # First, create an entry.
        payload = {
            "user_id": self.user1.id,
            "movie_id": self.movie.id,
            "rating": 3,
            "review": "Okay movie"
        }
        url = "/add_to_watched/"
        response = self.client.post(url, data=json.dumps(payload), content_type="application/json")
        self.assertEqual(response.status_code, 201)
        # Now, update the same entry.
        payload_update = {
            "user_id": self.user1.id,
            "movie_id": self.movie.id,
            "rating": 5,
            "review": "Great movie"
        }
        response_update = self.client.post(url, data=json.dumps(payload_update), content_type="application/json")
        # The view’s update branch may not return a proper success message (falling through to a 405 error)
        self.assertEqual(response_update.status_code, 200)

        url = "/add_to_watched/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, 405)

    #tests for recommend_movie
    def test_recommend_movie_success(self):
        payload = {
            "member_suggested": self.user1.id,
            "user_receiving": self.user2.id,
            "movie_id": self.movie.id
        }
        url = "/recommend_movie/"
        response = self.client.post(url, data=json.dumps(payload), content_type="application/json")
        print("📥 Response Status Code:", response.status_code)  # ✅ Debugging
        print("📥 Response Content:", response.json())  # ✅ Debugging
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.content)
        self.assertIn("Movie recommended successfully", data.get("message", ""))

        #tests for recommend_movie
    def test_recommend_movie_to_group_success(self):
        payload = {
            "member_suggested": self.user1.id,
            "user_receiving": self.group1.group_id.id,
            "movie_id": self.movie.id
        }
        url = "/recommend_movie/"
        response = self.client.post(url, data=json.dumps(payload), content_type="application/json")
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.content)
        self.assertIn("Movie recommended successfully", data.get("message", ""))

    def test_recommend_movie_to_group_genre_error(self):
        payload = {
            "member_suggested": self.user1.id,
            "user_receiving": self.group2.group_id.id,
            "movie_id": self.movie.id
        }
        url = "/recommend_movie/"
        response = self.client.post(url, data=json.dumps(payload), content_type="application/json")
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertIn("Movie doesn't fit group genre", data.get("error", ""))

    def test_recommend_movie_missing_fields(self):
        payload = {
            "member_suggested": self.user1.id,
            "movie_id": self.movie.id
        }
        url = "/recommend_movie/"
        response = self.client.post(url, data=json.dumps(payload), content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_recommend_movie_invalid_movie_id(self):
        payload = {
            "member_suggested": self.user1.id,
            "user_receiving": self.user2.id,
            "movie_id": "invalid"
        }
        url = "/recommend_movie/"
        response = self.client.post(url, data=json.dumps(payload), content_type="application/json")
        self.assertEqual(response.status_code, 400)

    #tests for update_recommendation
    def test_update_recommendation_no_group(self):
    #Test updating a recommendation when the user is not in a group"""
        recommendation = MemberRecommendation.objects.create(
            member_suggested=self.user1, 
            user_receiving=self.user2, 
            movie_id=10
        )

        response = self.client.post(
            reverse('update_recommendation'),
            json.dumps({'recommendation_id': recommendation.id, 'like': True}),
            content_type="application/json"
        )

        print("Response Data:", response.json())  # Debugging output

        self.assertEqual(response.status_code, 200)


    def test_update_recommendation_with_group(self):
        leader = User.objects.create(name="leader", email="leader@example.com")
        group = Group.objects.create(
            group_id=leader, 
            leader=leader,  
            group_name="Test Group",
            voting_limit=3
        )

        group_member = GroupMember.objects.create(group=group, member=self.user2)  #add member

        recommendation = MemberRecommendation.objects.create(
            member_suggested=self.user1, 
            user_receiving=self.user2, 
            movie_id=10
        )

        response = self.client.post(
            reverse('update_recommendation'),
            json.dumps({'recommendation_id': recommendation.id, 'like': True}),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 200)  #expecting success
        self.assertIn("Recommendation", response.json())

    #tests for send_messages
    def test_send_messages_success(self):
        payload = {
            "user_sending": self.user1.id,
            "user_recieving": self.user2.id,
            "message": "Hello"
        }
        url = "/send_message/"
        response = self.client.post(url, data=json.dumps(payload), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertIn("Message Sent", data.get("Success", ""))

    def test_send_messages_user_not_exist(self):
        payload = {
            "user_sending": self.user1.id,
            "user_recieving": 9999,
            "message": "Hello"
        }
        url = "/send_message/"
        response = self.client.post(url, data=json.dumps(payload), content_type="application/json")
        data = json.loads(response.content)
        self.assertIn("error", data)

    #tests for user_info
    def test_user_info_success(self):
        url = "/user_info/"
        response = self.client.get(url)
        data = json.loads(response.content)
        self.assertEqual(data.get("username"), self.user1.name)
        self.assertEqual(data.get("email"), self.user1.email)

    def test_user_info_no_token(self):
        session = self.client.session
        session.pop("id_token", None)
        session.save()
        url = "/user_info/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)

    #test for get_csrf_token
    def test_get_csrf_token(self):
        response = self.client.get(reverse('get_csrf_token'))
        data = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertIn("status", data)
        self.assertEqual(data["status"], "ok")

    #tests for retrieve_messages
    def test_retrieve_messages_success(self):
        # Create a message from user1 to user2.
        Message.objects.create(
            user_sending=self.user1,
            user_receiving=self.user2,
            message_content="Test message"
        )
        url = "/retrieve_messages/?user_id={}".format(self.user1.id)
        response = self.client.get(url)
        data = json.loads(response.content)
        self.assertTrue(data.get("success"))
        self.assertTrue(len(data.get("messages", [])) > 0)

    def test_retrieve_messages_user_not_exist(self):
        url = "/retrieve_messages/?user_id=9999"
        response = self.client.get(url)
        data = json.loads(response.content)
        self.assertIn("error", data)

    #tests for block_user
    def test_block_user(self):
        """Test blocking and unblocking a user"""
        url = reverse('block_user')
        #first call: Block the user. expect 201 Created
        payload = {
            "blocker_id": self.user1.id,
            "blocked_id": self.user2.id
        }

        response = self.client.post(url, data=json.dumps(payload), content_type="application/json")
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(data.get("message"), "User blocked successfully.")

        self.assertTrue(BlockList.objects.filter(blocker=self.user1, blocked=self.user2).exists())

        #second call should unblock the user and return code 200
        response = self.client.post(url, data=json.dumps(payload), content_type="application/json")
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data.get("message"), "User Unblocked")

        #check that user is removed from block list
        self.assertFalse(BlockList.objects.filter(blocker=self.user1, blocked=self.user2).exists())    
    