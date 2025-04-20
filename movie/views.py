from django.shortcuts import render
from movie.models import Movie
from django.http import JsonResponse
import requests
import os
from dotenv import load_dotenv
from movie.models import Movie, Watchlist, WatchlistItem, UserMovieJournal
from user.models import User
from django.db.models import Q
from user.views import get_user_username
import json
from django.views.decorators.csrf import csrf_exempt

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
        movies = Movie.objects.filter(Q(rating__iexact=query)).values(
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


        response['movies'] = list(movies)
        response['users'] = list(users)

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
                'plot': data.get('Plot', 'No plot available.'),
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



