from django.shortcuts import render
from movie.models import Movie
from django.http import JsonResponse
import requests
import os
from dotenv import load_dotenv
from movie.models import Movie
from django.db.models import Q

load_dotenv()



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

    url = f"https://api.themoviedb.org/3/movie/popular?language=en-US&page={page}"

    TMDB_BEARER = os.getenv("TVDB_BEARER")


    try:
        headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {TMDB_BEARER}"
        }

        response = requests.get(url, headers=headers)
        data = response.json()
        return JsonResponse(data, safe=False)
 
    except requests.exceptions.RequestException as e:
        return JsonResponse({"error": str(e)}, status=500)   



def Search(request):
    # Get the search query from the GET parameters
    query = request.GET.get('q', '')  # Default to empty string if no query

    # If there's a query, filter the movies based on the query
    if query:
        movies = Movie.objects.filter(
            Q(title__icontains=query) |
            Q(director__icontains=query)
        )
    else:
        # If no query, return all movies
        movies = Movie.objects.all()

    # Serialize the movies queryset into JSON
    movie_list = list(movies.values('id', 'title', 'year', 'runtime', 'rating', 'plot', 'director'))

    # Return the result as a JSON response
    return JsonResponse({'movies': movie_list, 'query': query}, safe=False)





