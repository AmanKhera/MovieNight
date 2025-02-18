from django.shortcuts import render
from movie.models import Movie
from django.http import JsonResponse
import requests
import os
from dotenv import load_dotenv
from movie.models import Movie
from user.models import User
from django.db.models import Q
from user.models import User

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



def Search(request):

    #Get the search query and filter from GET parameters
    query = request.GET.get('q', '').strip()
    year = request.GET.get('year','').strip()
    movie_id = request.GET.get('id','')
    filter_type = request.GET.get('filter', '').strip().lower()

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
        users = User.objects.filter(Q(name__icontains=query)).values('id', 'name', 'email')
        response['users'] = list(users)

    elif filter_type == "director":
        directors = Movie.objects.filter(Q(director__icontains=query)).values('id', 'title', 'year', 'runtime', 'rating', 'plot', 'director')
        response['directors'] = list(directors)

    elif filter_type == "movie":
        movies = Movie.objects.filter(Q(title__icontains=query)).values(

            'id', 'title', 'year', 'runtime', 'rating', 'plot', 'director'
        )
        response['movies'] = list(movies)

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
        
        users = User.objects.filter(Q(name__icontains=query)).values('id', 'name', 'email')


        response['movies'] = list(movies)
        response['users'] = list(users)

    return JsonResponse(response, safe=False)




from django.http import JsonResponse
import requests
import os
def api_movie_search(request):
    search = request.GET.get('q')  # Get movie title from query parameters
    OMDB_API_KEY = os.getenv("OMDB_API_KEY")
    omdb_url = f"http://www.omdbapi.com/?apikey={OMDB_API_KEY}&"

    title_params = {
        't': search,
    }

    try:
        response = requests.get(omdb_url, params=title_params)
        data = response.json()
        print(data.get('Rated'))
        if data.get('Response') == 'False':
            return JsonResponse({'error': data.get('Error', 'Movie not found.')}, status=404)

        # Check if runtime exists and is in the expected format
        runtime_str = data.get('Runtime', '0 min')  # Default to '0 min' if not found
        try:
            runtime = int(runtime_str.split()[0])  # Extract the number from '120 min'
        except (ValueError, IndexError):
            runtime = 0  # Default to 0 if the runtime is not in the expected format

        # Save the movie data to the database (or update if it exists)
        Movie.objects.update_or_create(
            title=data.get("Title", "Unknown Title"),
            defaults={
                'year': data.get('Year', 'Unknown Year'),
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
