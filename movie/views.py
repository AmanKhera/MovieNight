from django.shortcuts import render
from movie.models import Movie
from django.http import JsonResponse
import requests
import os
from dotenv import load_dotenv
from movie.models import Movie, Watchlist, WatchlistItem, UserMovieJournal, RecommendationFeedback
from group.models import Group
from user.models import User
from django.db.models import Q
from user.views import get_user_username
import json
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

load_dotenv()
genre_dictionary = {
    "action":28,
    "adventure":12,
    "animation":16,
    "comedy":35,
    "crime":80,
    "documentary":99,
    "drama":18,
    "family":10751,
    "fantasy":14,
    "history":36,
    "horror":27,
    "mystery":9648,
    "romance":10749,
    "science fiction":878,
    "war":10752,
    "thriller":37
}


#Movie Poster Method
#Grabs title of movie and returns poster of movie in json format
#params: title: Which is title of movie
#returns a dictionary containing title and poster
def Movie_Poster(request):
    title = request.GET.get('title')
    if not title:
        return JsonResponse({"error": "Title is required"}, status=400)

    api_key = os.getenv("OMDB_API_KEY")
    omdb_url = f"http://www.omdbapi.com/?apikey={api_key}&"

    omdb_params = {
        't': title
    }

    try:
        response = requests.get(omdb_url, params = omdb_params)

        data = response.json()

        poster = data.get("Poster")
        if not poster or poster == "N/A":
            return JsonResponse({"error": "Poster not found for title"})

        return JsonResponse({"Title": title, "poster": poster})

    except requests.exceptions.RequestException as e:
        return JsonResponse({"error": "Failed to fetch data from OMDB API", "details": str(e)}, status=500)


#Popular Movies
#Grabs current popular movies by default returns page 1 but can add page in url to grab more
#params: page: optional param used to show more results
#returns json containing popular movies with all relevant information
def popular(request):
    #Defaults to first page if no page is put in
    page = request.GET.get('page', 1)

    TMDB_API_KEY = os.getenv("TMDB_API_KEY")

    url = f"https://api.themoviedb.org/3/movie/popular?language=en-US&page={page}&api_key={TMDB_API_KEY}"

    try:

        response = requests.get(url)
        data = response.json()
        return JsonResponse(data, safe=False)

    except requests.exceptions.RequestException as e:
        return JsonResponse({"error": str(e)}, status=500)


# Helper for pagination
def paginate(queryset, page, items_per_page=20):
    try:
        page = int(page)
        if page < 1:
            page = 1
    except (ValueError, TypeError):
        page = 1

    start = (page - 1) * items_per_page
    end = start + items_per_page
    return queryset[start:end]


#Search function
#Can be used to search for movie, user, director, and via movie id
#params: q: which is usually movie title but can also be user or director if specified in filter_type
#params: filter: filter can be 'user', or 'director' also requires q param
#returns: list of movies or users
def Search(request):

    #Get the search query and filter from GET parameters
    query = request.GET.get('q', '').strip()
    year = request.GET.get('year','').strip()
    movie_id = request.GET.get('id','')
    filter_type = request.GET.get('filter', '').strip().lower()
    rating = request.GET.get('rating', '').strip() 
    max_runtime = request.GET.get('runtime', '').strip()

    page = request.GET.get('page', 1)
    

    #Initialize response
    response = {'query': query}


    #If no query is provided, returns an empty response
    if not query and not movie_id:
        return JsonResponse({'error': 'Query parameter is required'}, status=400)

    if year:
        movies = Movie.objects.filter(Q(title__icontains=query) & Q(year=year)).values(
            'id', 'title', 'year', 'runtime', 'rating', 'plot', 'director'
        )

        response['movies'] = list(movies)
        return JsonResponse(response)

    if filter_type == "user":
        users = User.objects.filter(Q(username__icontains=query)).values('id', 'name', 'email', 'username')
        response['users'] = list(users)

    elif filter_type == "director":
        directors = Movie.objects.filter(Q(director__icontains=query)).values('id', 'title', 'year', 'runtime', 'rating', 'plot', 'director')
        response['directors'] = list(directors)

    elif filter_type == "movie":
        movies = Movie.objects.filter(Q(title__icontains=query)).values(

            'id', 'title', 'year', 'runtime', 'rating', 'plot', 'director'
        )
        response['movies'] = list(movies)


    elif filter_type == "rating":
        movies = Movie.objects.filter(Q(rating__iexact=rating)).values(
            'id', 'title', 'year', 'runtime', 'rating', 'plot', 'director'
        )
        response['movies'] = list(movies)

    elif filter_type == "runtime":
        if query.isdigit():
            max_runtime = int(query)
            if max_runtime in [90, 120, 180]:  # preset runtimes
                movies = Movie.objects.filter(runtime__lte=max_runtime).values(
                    'id', 'title', 'year', 'runtime', 'rating', 'plot', 'director'
                )
                response['movies'] = list(movies)
            else:
                return JsonResponse({'error': 'Unsupported runtime preset.'}, status=400)
        else:
            return JsonResponse({'error': 'Runtime must be a numeric preset (90, 120, 180).'}, status=400)

    #search via movie id
    elif not query:
        movies = Movie.objects.filter(
            id=movie_id
        ).values('id', 'title', 'year', 'runtime', 'rating', 'plot', 'director')

        response['movies'] = list(movies)

    else:
        movies = Movie.objects.filter(

            Q(title__icontains=query) | Q(director__icontains=query)
        ).values('id', 'title', 'year', 'runtime', 'rating', 'plot', 'director')

        users = User.objects.filter(Q(name__icontains=query)).values('id', 'name', 'email', 'username')


        response['movies'] = list(paginate(movies,page))
        response['users'] = list(paginate(users,page))

    return JsonResponse(response, safe=False)




#API Movie Search Function
#If search function does not return correct movie us this function instead
#params: title: title of movie, and release date: the year the movie is released
#returns the correct movie and the movie is also added to our database
def api_movie_search(request):
    # Get movie title and release date from query parameters
    movie_title = request.GET.get('title')
    release_date = request.GET.get('release_date')  # Expecting "YYYY-MM-DD" or "YYYY"

    # Extract the year from the release date if provided
    release_year = None
    if release_date:
        release_year = release_date.split('-')[0]  # Gets the "YYYY" part

    OMDB_API_KEY = os.getenv("OMDB_API_KEY")
    omdb_url = f"http://www.omdbapi.com/?apikey={OMDB_API_KEY}"

    # Build the query parameters for the OMDb API
    query_params = {
        't': movie_title,
    }
    if release_year:
        query_params['y'] = release_year

    try:
        response = requests.get(omdb_url, params=query_params)
        data = response.json()

        if data.get('Response') == 'False':
            return JsonResponse({'error': data.get('Error', 'Movie not found.')}, status=404)

        # Check if runtime exists and is in the expected format
        runtime_str = data.get('Runtime', '0 min')  # Default to '0 min' if not found
        try:
            runtime = int(runtime_str.split()[0])  # Extract the number from something like '120 min'
        except (ValueError, IndexError):
            runtime = 0  # Default to 0 if the runtime is not in the expected format

        # Use both title and year as lookup fields to ensure uniqueness
        movie, created = Movie.objects.update_or_create(
            title=data.get("Title", "Unknown Title"),
            year=data.get('Year', 'Unknown Year'),
            defaults={
                'runtime': runtime,
                'rating': data.get('Rated', 'N/A'),
#                'plot': data.get('Plot', 'No plot available.'),
                'director': data.get('Director', 'Unknown Director'),
            }
        )

        return JsonResponse(data, safe=False)

    except requests.exceptions.RequestException as e:
        return JsonResponse({"error": str(e)}, status=500)




#Discover Movies Method
#Params:
#page = Used to show more movies of the same genre
#genre = Given as a string in lowercase and finds movies matching that genre
#Return: Dictionary with all movie data
def discover_movies(request):

    #Defaults to first page if no page is put in
    page = request.GET.get('page', 1)
    genre = request.GET.get('genre')


    TMDB_API_KEY = os.getenv("TMDB_API_KEY")

    url = "https://api.themoviedb.org/3/discover/movie"

    params = {
        "api_key": TMDB_API_KEY,
        "language": "en-US",
        "sort_by": "popularity.desc",
        "with_genres": genre_dictionary[genre],
        "page": page
    }

    try:

        response = requests.get(url, params=params)
        data = response.json()
        return JsonResponse(data, safe=False)

    except requests.exceptions.RequestException as e:
        return JsonResponse({"error": str(e)}, status=500)



#Discover Movies Method
#Params:
#page = Used to show more movies of the same genre
#genre = Given as a string in lowercase and finds movies matching that genre
#Return: Dictionary with all movie data

# def discover_movies(request):

def discover_movies(request):
        #Defaults to first page if no page is put in
    page = request.GET.get('page', 1)
    genre = request.GET.get('genre')


    TMDB_API_KEY = os.getenv("TMDB_API_KEY")

    url = "https://api.themoviedb.org/3/discover/movie"


    params = {
        "api_key": TMDB_API_KEY,
        "language": "en-US",
        "sort_by": "popularity.desc",
        "with_genres": genre_dictionary[genre],
        "page": page
    }

    try:

        response = requests.get(url, params=params)
        data = response.json()
        return JsonResponse(data, safe=False)
 
    except requests.exceptions.RequestException as e:
        return JsonResponse({"error": str(e)}, status=500)


#Favorite method
#Desc: This method can be used to toggle favorite
#Example if a user favorites a movie and presses the button again it will unfavorite it
#Requires post request
#params: Movie_id
#returns if favorite is true or false, if true frontend needs to call add to watchlist method
@csrf_exempt
def favorite(request):

    if request.method == "POST":
        try:
            data = json.loads(request.body)
            movie_id = data.get("movie_id")

            username = data.get('username')
            user = (User.objects.get(username=username))

            movie_item, create = UserMovieJournal.objects.get_or_create(user=user, movie_id=movie_id)

            if movie_item.favorite == True:
                movie_item.favorite = False
                movie_item.save()
                return JsonResponse({"Favorite":False}, status=200)

            movie_item.favorite = True
            movie_item.save()

            return JsonResponse({"Favorite":True}, status=200)

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error':"Expected POST request"}, status=500)



#Retrieve Favorites method
#No parameter is needed
#Returns jsonresponse which contains all favorited movies and their related information
def retrieve_favorites(request):

    if request.method == "GET":
        username = request.GET.get('username')
        user = User.objects.get(username = username)

        favorite_movies = Movie.objects.filter(
            user_journals__user=user,
            user_journals__favorite=True
        ).distinct()

        favorite_items = list(favorite_movies.values())

        return JsonResponse({'favorite_items': favorite_items}, status=200)

    else:
        return JsonResponse({'error':"Expected GET request"}, status=500)





#CHATGPT Implementation

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from openai import OpenAI
import os
import json
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

@csrf_exempt
@require_POST
def generate_movie_summary(request):

    data = json.loads(request.body)
    movie_info = data.get("movie_info", {})

    title = movie_info.get('title')
    year = movie_info.get('year', '')
        

    movie = Movie.objects.get(title = title, year = year)
    director = movie.director
    plot = movie.plot

    if movie.plot_overwritten:
        return JsonResponse({'summary': plot})

    return generate_movie_and_store(title, year, director, plot)



def generate_movie_and_store(title, year, director, plot):
    
    try:
        #data = json.loads(request.body)
        #movie_info = data.get('movie_info', {})
        
        #if not movie_info:
        #    return JsonResponse({'error': 'Movie information is required'}, status=400)
        
        # Construct prompt from movie info
        prompt = f"""Create an engaging, spoiler-free plot summary for this movie:
Title: {title}
Year: {year}
Director: {director}
Original Plot: {plot}

Write a 150-200 word summary that would appeal to potential viewers, highlighting what makes this movie special while avoiding major spoilers."""
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a movie expert who creates compelling summaries."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.7
        )
        
        summary = response.choices[0].message.content

        updated = False
        if title and year:
            updated = update_movie_plot(title, year, summary)
        
        return JsonResponse({'summary': summary})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    

def update_movie_plot(movie_title, movie_year, new_plot):
    updated = Movie.objects.filter(title = movie_title, year=movie_year).update(plot = new_plot, plot_overwritten=True)
    return updated


@csrf_exempt
@require_POST
def generate_recommendations(request):
    try:
        data = json.loads(request.body)
        user_id = data.get("user_id")

        if not user_id:
            return JsonResponse({"error": "User ID is required"}, status = 400)
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return JsonResponse({"error": "User not found"})


        #grabs all movies the user has been recommended before
        feedback = RecommendationFeedback.objects.filter(user=user).select_related("movie")
        #splits movies based on liked and disliked
        liked = [f.movie.title for f in feedback if f.liked]
        disliked = [f.movie.title for f in feedback if not f.liked]   


        #grabs all movies the user has seen
        seen = Movie.objects.filter(user_journals__user=user).distinct()
        seen_titles = list(seen.values_list("title", flat=True))     


        #payload
        user_payload = {
            "liked": liked,
            "disliked": disliked,
            "seen": seen_titles
        }

        system_prompt = (
            "You are a highly intelligent and discerning movie recommendation engine. "
            "You analyze a user's prior movie preferences to suggest 20 unique movies they haven't seen. "
            "Use the `liked` list to infer genres or themes the user enjoys. "
            "Avoid anything from `disliked` or `seen`. "
            "Respond ONLY with a valid JSON object using this format: "
            "{\"recommendations\": [\"Movie Title 1\", \"Movie Title 2\", ..., \"Movie Title 21\"]}. "
            "Do not include any explanations or extra text — just the JSON."
        )


        # Call OpenAI
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_payload)}
            ],
            max_tokens=400,
            temperature=0.7
        )
        gpt_content = response.choices[0].message.content
        try:
            parsed = json.loads(gpt_content)
            print(parsed)
            return JsonResponse({'summary': parsed})
            
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON response from GPT"}, status=500)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

# @csrf_exempt
# def generate_recommendations(request):
#     if request.method != 'POST':
#         return JsonResponse({'error': 'Only POST requests are allowed'}, status=405)
    
#     try:
#         data = json.loads(request.body)
#         user_id = data.get('user_id', {})
#         user = User.objects.get(id = user_id) 
        
#         if not user_id:
#             return JsonResponse({'error': 'Movie information is required'}, status=400)
        
#         # assuming you have a User instance in `user`
#         feedback_count = RecommendationFeedback.objects.filter(user=user).count()


#         if feedback_count > 20:
                    
#             feedback = RecommendationFeedback.objects.filter(user=user).select_related('movie')

#             liked_ids = [f.movie.id for f in feedback if f.liked]
#             disliked_ids = [f.movie.id for f in feedback if not f.liked]


#             disliked = list(Movie.objects.filter(id__in=disliked_ids).values('title', flat = True))
#             liked = list(Movie.objects.filter(id__in=liked_ids).values('title', flat = True))

#             prev_prefs = {
#                 "liked": liked,
#                 "disliked": disliked,
#             }


#             prompt = (
#                 "You are a movie recommendation engine. "
#                 "Given the user’s preference data below, return exactly one JSON object "
#                 "with a single key `recommendations` whose value is an array of 21 movie titles.\n\n"
#                 "Do not recommend any movie that appears in the given list."
#                 f"{json.dumps(prev_prefs)}"
#             )          

#             response = client.chat.completions.create(
#                 model="gpt-3.5-turbo",
#                 messages=[
#                     {"role": "system", "content": "You are a movie expert who gives recommendations."},
#                     {"role": "user", "content": prompt}
#                 ],
#                 max_tokens=400,
#                 temperature=0.6
#             )
            
#             summary = response.choices[0].message.content
#             return JsonResponse({'summary': summary})
        
#         else:

#             user_liked = Movie.objects.filter(
#                 user_journals__user=user,
#                 user_journals__rating__gt = 3.5
#             ).distinct()

#             user_seen = Movie.objects.filter(
#                 user_journals__user=user
#             ).distinct()



#             liked_titles = list(user_liked.values_list('title', flat = True))
#             seen_titles = list(user_seen.values_list('title', flat = True))
            
        
#             system_prompt = (
#                 "You are a movie recommendation engine. "
#                 "When given a JSON payload of user preferences, "
#                 "you must respond with _only_ valid JSON containing a single key "
#                 "`recommendations` whose value is an array of 21 **unique** movie titles. "
#                 "Do not repeat any title. "                     
#                 "Do not recommend any movie that appears in the `seen` list."
#             )
  

#             user_payload = {
#                 'liked':liked_titles,
#                 'seen':seen_titles,
#             }

#             prompt = json.dumps(user_payload)  

#             response = client.chat.completions.create(
#                 model="gpt-3.5-turbo",
#                 messages=[
#                     {"role": "system", "content": system_prompt},
#                     {"role": "user", "content": prompt}
#                 ],
#                 max_tokens=400,
#                 temperature=0.6
#             )
            
#             summary = response.choices[0].message.content
#             return JsonResponse({'summary': summary})
        
#     except Exception as e:
#          return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def review_recommendations(request):

    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST requests are allowed'}, status=405)

    try:
        data = json.loads(request.body)
        user_id = data.get('user_id', {})
        user = User.objects.get(id = user_id) 
        movie_title = data.get("movie_title")
        review = data.get('review')

        movie = Movie.objects.get(title=movie_title)  
        if review == True:
            watchlist_main = Watchlist.objects.get(user_id = user_id, name = "Watchlist")
            if WatchlistItem.objects.filter(watchlist=watchlist_main, movie_id=movie.id).exists():
                return JsonResponse({'message': 'Movie is already in the watchlist'}, status=200)

            # Add the movie to the watchlist
            WatchlistItem.objects.create(watchlist=watchlist_main, movie_id=movie.id)
            
        
        feedback_updated, created = RecommendationFeedback.objects.update_or_create(user = user, movie=movie, liked = review)

        return JsonResponse({
            'status': 'created' if created else 'updated',
            'user_id': user.id,
            'movie_id': movie.id,
            'liked': feedback_updated.liked,
        })

    except:
        return JsonResponse({'error': 'Invalid JSON.'}, status=400)
