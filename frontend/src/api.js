// src/api.js

export const fetchUserInfo = async () => {
    const response = await fetch("http://localhost:8000/user_info/", {
      credentials: "include",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch user info.");
    }
    return data;
  };
  
  export const fetchMovieRecommendations = async (userId) => {
    const response = await fetch("http://localhost:8000/movie_rec/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Recommendation failed");
    return data;
  };
  
  export const fetchMovieDetailsByTitle = async (title) => {
    const response = await fetch(
      `http://localhost:8000/search/?filter=movie&q=${encodeURIComponent(title)}`,
      { credentials: "include" }
    );
    const data = await response.json();
    if (!response.ok) throw new Error("Search failed");
    return data.movies?.[0] || null;
  };

  export const fetchWatchlistItems = async () => {
    const response = await fetch("http://localhost:8000/watchlist_items/", {
      credentials: "include",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch watchlist items.");
    }
    return data;
  };
  
  export const fetchMovieDetails = async (movieId) => {
    const response = await fetch(`http://localhost:8000/search/?id=${movieId}`, {
      credentials: "include",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch movie details.");
    }
    return data.movies?.[0] || null;
  };

  
  
  export const fetchMoviePoster = async (title) => {
    const response = await fetch(
      `http://localhost:8000/movie_poster/?title=${encodeURIComponent(title)}`,
      { credentials: "include" }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch movie poster.");
    }
    return data.poster;
  };
  
  export const fetchWatchlistMovies = async () => {
    const watchlistData = await fetchWatchlistItems();
    
    if (watchlistData.status !== "success") {
      throw new Error(watchlistData.message || "Invalid watchlist data");
    }
  
    const moviePromises = watchlistData.watchlist.map(item => 
      fetchMovieDetails(item.movie_id)
    );
    const detailedMovies = await Promise.all(moviePromises);
    const validMovies = detailedMovies.filter(Boolean);
  
    const moviesWithPosters = await Promise.all(
      validMovies.map(async (movie) => {
        if (!movie.poster_path || movie.poster_path === "N/A") {
          try {
            const poster = await fetchMoviePoster(movie.title || movie.original_title);
            return { ...movie, poster };
          } catch (err) {
            console.error("Error fetching poster:", err);
            return movie;
          }
        }
        return movie;
      })
    );
  
    return moviesWithPosters.slice(0, 7);
  };
  
export const fetchRecentlyWatched = async () => {
  const userInfo = await fetchUserInfo();
  if (!userInfo.id) {
    throw new Error("User ID not found");
  }

  const response = await fetch(
    `http://localhost:8000/recently_watched/?user_id=${userInfo.id}`,
    { credentials: "include" }
  );
  const watchedData = await response.json();

  if (!response.ok) {
    throw new Error(watchedData.message || "Failed to fetch recently watched.");
  }

  // Get movie details while preserving the original journal data
  const enhancedMovies = await Promise.all(
    watchedData.map(async (journalEntry) => {
      try {
        const movieDetails = await fetchMovieDetails(journalEntry.movie);
        
        // Create the base enhanced movie object
        const enhancedMovie = {
          ...journalEntry,  // Keep the original rating/review/date
          ...movieDetails,  // Add movie details
        };

        // Handle poster separately
        const posterPath = movieDetails.poster_path;
        if (posterPath && posterPath !== "N/A") {
          enhancedMovie.poster = `https://image.tmdb.org/t/p/w500${posterPath}`;
        } else {
          const fallbackPoster = await fetchMoviePoster(journalEntry.title).catch(() => null);
          if (fallbackPoster !== null) {
            enhancedMovie.poster = fallbackPoster;
          }
        }

        return enhancedMovie;
      } catch (error) {
        console.error("Error enhancing movie:", error);
        // Return the journal entry without any poster field if there was an error
        return { ...journalEntry };
      }
    })
  );

  return enhancedMovies;
};
  export const addToWatchlistAPI = async (movie) => {
    const titleParam = movie.title || movie.original_title;
    if (!titleParam) {
      throw new Error("Invalid movie title");
    }
  
    const releaseDate = movie.release_date || "";
    const releaseYear = releaseDate ? releaseDate.split("-")[0] : "";
  
    const params = ["q=" + titleParam];
    if (releaseYear) {
      params.push("year=" + releaseYear);
    }
  
    const searchUrl = "http://localhost:8000/search/?" + params.join("&");
    const searchResponse = await fetch(searchUrl, {
      method: "GET",
      credentials: "include",
    });
  
    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      throw new Error(errorData.error || "Failed to search");
    }
  
    const searchData = await searchResponse.json();
    if (!searchData.movies || searchData.movies.length === 0) {
      throw new Error("Movie not found in search");
    }
  
    const foundMovieId = searchData.movies[0].id;
    const addResponse = await fetch(
      "http://localhost:8000/add_movie/?movie_id=" + foundMovieId,
      {
        method: "GET",
        credentials: "include",
      }
    );
  
    if (!addResponse.ok) {
      const errorData = await addResponse.json();
      throw new Error(errorData.error || "Failed to add to watchlist");
    }
  
    return await addResponse.json();
  };