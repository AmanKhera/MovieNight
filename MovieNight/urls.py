"""
URL configuration for MovieNight project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from movie import views as movie_views
from user_login import views as user_login_views
from user import views as user_views
from movie import views as movie_views
from group import views as group_views



urlpatterns = [
    path('admin/', admin.site.urls),

    #Links to cognito login page
    path('hosted-login', user_login_views.hosted_ui_login, name='hosted_ui_login'),

    #used to grab authentication tokens
    path('Login', user_login_views.login_callback, name='login_callback'),

    path('update_table', user_login_views.update_or_create_user_from_cognito, name='login_callback'),

    #grabs movie poster, url example: http://127.0.0.1:8000/movie_poster/?title=Inception
    #returns dictionary as {"Title": "Inception", "poster": "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg"}
    path('movie_poster/', movie_views.Movie_Poster, name='movie_poster'),

    path('username/', user_views.username, name='username'),

    #grabs current popular movies and returns a dictionary as JSON
    #can use page in url to get more results but by default page is not needed
    #url example: http://127.0.0.1:8000/popular_movie/?page=2
    path('popular_movie/', movie_views.popular, name='popular_movies'),

    #http://localhost:8000/search/?q=Inception
    path('search/', movie_views.Search, name='search'),


    path('watchlist/', user_views.create_watchlist, name='watchlist'),

    #http://127.0.0.1:8000/create_relationship/?follower_id=1&following_id=2

    path('create_relationship/', user_views.create_relationship, name='relationship'),

    #http://127.0.0.1:8000/get_followers/?id=1
    path('get_followers/', user_views.get_followers, name='followers'),

    path('get_following/', user_views.get_following, name='following'),

    #http://127.0.0.1:8000/get_mutual_friends/?id=1
    path('get_mutual_friends/', user_views.get_mutual_friends, name='friends'),  

    path('add_movie/', user_views.add_movie, name='friends'),    

    #http://127.0.0.1:8000/create_group/?leader_id=1&group_name=amans&genre=horror
    path('create_group/', group_views.create_group, name='create_group'),    

    path('add_members/', group_views.add_member_to_group, name='add_members'),

    path('remove_member/', group_views.remove_member_from_group, name='remove_member'),  

    path('add_to_watched/', user_views.add_to_watched, name='add_to_watched'),

    path('grab_watchlist/', user_views.grab_watchlists, name='grab_watchlist'),

    path('watchlist_items/', user_views.grab_watchlist_items, name='watchlist_items'),


    path('api_search/', movie_views.api_movie_search, name='api_search'),
    path('recommend_movie/', user_views.recommend_movie),
    path('update_recommendation/', group_views.update_recommendation, name='update_recommendation'),
    path('send_message/', user_views.send_messages),
    path('user_info/', user_views.user_info),
    path('get-csrf-token/', user_views.get_csrf_token, name='get_csrf_token'),
    path('group_recommendation/', group_views.group_recommendation, name='group_recommendation'),

    path('discover_movie/', movie_views.discover_movies, name='discover_movie'),

    path('retrieve_messages/', user_views.retrieve_messages, name='retrieve_messages'),
    path('recently_watched/', user_views.retrieve_recently_watched, name='recently_watched'),
    path('update_username/', user_views.update_username, name='update_username'),   
    path('favorite', movie_views.favorite, name = 'favorite'),
    path('retrieve_favorite', movie_views.retrieve_favorites, name = 'retrieve_favorites'),

    path('block_user/', user_views.block_user, name='block_user'),
    path("check_blocked/", user_views.check_blocked, name="check_blocked"),
    path('view_blocked_users/', user_views.view_blocked_users, name = "view_blocked_users"),


    path('get_user_groups/', group_views.get_user_groups, name = 'get_user_groups'),
    path('frontend_user/', user_views.frontend_username, name = 'frontend_user'),
    #path('leave_group/', group_views.leave_group, name = 'leave_group'),
    path('generate-movie-summary/', movie_views.generate_movie_summary, name='generate_movie_summary'),
    path('group_messages/', group_views.retrieve_group_messages, name='group_messages'),
    path('movie_rec/', movie_views.generate_recommendations, name='group_messages'),
    path('movie_review/', movie_views.review_recommendations, name='group_messages'),
    path('group_recs/', group_views.retrieve_model_recommendations, name='group_messages'),
    path('generate_group_recommendations/', group_views.generate_group_recommendations, name='group_messages'),
    path('retrieve_model_recs/', group_views.retrieve_model_recommendations, name='group_messages'),
    path('retrieve_feed/', user_views.retrieve_feed, name='group_messages'),
    path('get_following_watch_status/', user_views.get_following_watch_status, name='group_messages'),
    ]



