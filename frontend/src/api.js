const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
};

export const fetchUserInfo = async () => {
  const response = await fetch("http://localhost:8000/user_info/", {
    credentials: "include",
  });
  return handleResponse(response);
};

export const fetchUserGroups = async (username) => {
  const response = await fetch(
    `http://localhost:8000/get_user_groups/?username=${username}`,
    { credentials: "include" }
  );
  const data = await handleResponse(response);
  return data.groups || [];
};

export const fetchGroupMembers = async (groupId) => {
  const response = await fetch(
    `http://localhost:8000/get_group_members/?group_id=${groupId}`,
    { credentials: "include" }
  );
  const data = await handleResponse(response);
  return data.members || [];
};

export const createGroup = async (csrfToken, { group_name, leader_id, genre }) => {
  const response = await fetch("http://localhost:8000/create_group/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify({ group_name, leader_id, genre }),
  });
  return handleResponse(response);
};

export const addGroupMember = async (csrfToken, { group_id, user_id }) => {
  const response = await fetch("http://localhost:8000/add_members/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify({ group_id, user_id }),
  });
  return handleResponse(response);
};

export const removeGroupMember = async (csrfToken, { group_id, user_id }) => {
  const response = await fetch("http://localhost:8000/remove_group_member/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify({ group_id, user_id }),
  });
  return handleResponse(response);
};

export const fetchMutualFriends = async (userId) => {
  const response = await fetch(
    `http://localhost:8000/get_mutual_friends/?id=${userId}`,
    { credentials: "include" }
  );
  const data = await handleResponse(response);
  return data.friends || [];
};

export const addFriend = async (csrfToken, { friend_id }) => {
  const response = await fetch("http://localhost:8000/add_friend/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify({ friend_id }),
  });
  return handleResponse(response);
};

export const fetchMovieRecommendations = async (userId) => {
  const response = await fetch("http://localhost:8000/movie_rec/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  return handleResponse(response);
};

export const fetchMovieDetailsByTitle = async (title) => {
  const response = await fetch(
    `http://localhost:8000/search/?filter=movie&q=${encodeURIComponent(title)}`,
    { credentials: "include" }
  );
  const data = await handleResponse(response);
  return data.movies?.[0] || null;
};

export const fetchMoviePoster = async (title) => {
  const response = await fetch(
    `http://localhost:8000/movie_poster/?title=${encodeURIComponent(title)}`,
    { credentials: "include" }
  );
  const data = await handleResponse(response);
  return data.poster;
};

export const fetchWatchlistItems = async () => {
  const response = await fetch("http://localhost:8000/watchlist_items/", {
    credentials: "include",
  });
  return handleResponse(response);
};

export const fetchMovieDetails = async (movieId) => {
  const response = await fetch(`http://localhost:8000/search/?id=${movieId}`, {
    credentials: "include",
  });
  const data = await handleResponse(response);
  return data.movies?.[0] || null;
};

export const fetchWatchlistMovies = async () => {
  const watchlistData = await fetchWatchlistItems();
  if (watchlistData.status !== "success") {
    throw new Error(watchlistData.message || "Invalid watchlist data");
  }
  
  if (!watchlistData.watchlist || watchlistData.watchlist.length === 0) {
    return [];
  }

  const moviePromises = watchlistData.watchlist.map(async (item) => {
    try {
      return await fetchMovieDetails(item.movie_id);
    } catch (error) {
      console.error(`Error fetching movie ${item.movie_id}:`, error);
      return null;
    }
  });
  
  const detailedMovies = await Promise.all(moviePromises);
  const validMovies = detailedMovies.filter(Boolean);
  
  const moviesWithPosters = await Promise.all(
    validMovies.map(async (movie) => {
      if (!movie.poster_path || movie.poster_path === "N/A") {
        try {
          const poster = await fetchMoviePoster(movie.title || movie.original_title);
          return { ...movie, poster };
        } catch (err) {
          console.error(`Error fetching poster for ${movie.title}:`, err);
          return movie;
        }
      }
      return movie;
    })
  );
  
  return moviesWithPosters;
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
  const watchedData = await handleResponse(response);
  
  if (!watchedData || watchedData.length === 0) {
    return [];
  }

  const enhancedMovies = await Promise.all(
    watchedData.map(async (journalEntry) => {
      try {
        const movieDetails = await fetchMovieDetails(journalEntry.movie);
        const enhancedMovie = {
          ...journalEntry,
          ...movieDetails,
        };
        const posterPath = movieDetails?.poster_path;
        if (posterPath && posterPath !== "N/A") {
          enhancedMovie.poster = `https://image.tmdb.org/t/p/w500${posterPath}`;
        } else {
          try {
            const fallbackPoster = await fetchMoviePoster(journalEntry.title || movieDetails?.title);
            if (fallbackPoster) {
              enhancedMovie.poster = fallbackPoster;
            }
          } catch (posterError) {
            console.error(`Error fetching fallback poster for ${journalEntry.title}:`, posterError);
          }
        }
        return enhancedMovie;
      } catch (error) {
        console.error(`Error enhancing movie ${journalEntry.movie}:`, error);
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
  const params = ["q=" + encodeURIComponent(titleParam)];
  if (releaseYear) {
    params.push("year=" + releaseYear);
  }
  const searchUrl = "http://localhost:8000/search/?" + params.join("&");
  const searchResponse = await fetch(searchUrl, {
    method: "GET",
    credentials: "include",
  });
  const searchData = await handleResponse(searchResponse);
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
  return handleResponse(addResponse);
};

export const removeFromWatchlistAPI = async (movieId) => {
  const response = await fetch(
    `http://localhost:8000/remove_from_watchlist/?movie_id=${movieId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );
  return handleResponse(response);
};


// Add these functions to your existing api.js file:

// Fetch all watchlists
export const fetchAllWatchlists = async () => {
  const response = await fetch("http://localhost:8000/grab_watchlist/", {
    credentials: "include",
  });
  const data = await handleResponse(response);
  // Backend returns: {"status": "success", "watchlist": [...]}
  return data.watchlist || [];
};

// Create new watchlist  
export const createWatchlist = async (csrfToken, watchlistData) => {
  // Backend expects: name parameter in GET request, not POST with JSON body
  const params = new URLSearchParams({
    name: watchlistData.watchlist_name
  });
  
  const response = await fetch(`http://localhost:8000/watchlist/?${params}`, {
    method: "GET", // Backend uses GET method for creation
    credentials: "include",
    headers: {
      "X-CSRFToken": csrfToken,
    },
  });
  return handleResponse(response);
};

// Fetch movies for specific watchlist by watchlist name
export const fetchWatchlistMoviesByName = async (watchlistName) => {
  const params = new URLSearchParams({
    watchlist_name: watchlistName
  });
  
  const response = await fetch(`http://localhost:8000/watchlist_items/?${params}`, {
    method: "GET",
    credentials: "include",
  });
  const data = await handleResponse(response);
  // Backend returns: {"status": "success", "watchlist": [...]}
  return data.watchlist || [];
};


// Helper function to fetch movies by watchlist ID (converts ID to name first)
export const fetchWatchlistMoviesById = async (watchlistId) => {
  // First get all watchlists to find the name by ID
  const watchlists = await fetchAllWatchlists();
  const watchlist = watchlists.find(w => w.id === watchlistId);
  
  if (!watchlist) {
    throw new Error('Watchlist not found');
  }
  
  // Fetch basic watchlist items
  const watchlistItems = await fetchWatchlistMoviesByName(watchlist.name);
  
  if (!watchlistItems || watchlistItems.length === 0) {
    return [];
  }


  
  // Fetch detailed movie information for each item (using your existing logic)
  const moviePromises = watchlistItems.map(async (item) => {
    try {
      const movieDetails = await fetchMovieDetails(item.movie_id);
      if (!movieDetails) return null;
      
      // Combine the watchlist item data with movie details
      let enhancedMovie = {
        ...item,
        ...movieDetails,
      };
      
      // Handle poster fetching (same logic as your existing fetchWatchlistMovies)
      if (!movieDetails.poster_path || movieDetails.poster_path === "N/A") {
        try {
          const poster = await fetchMoviePoster(movieDetails.title || movieDetails.original_title);
          if (poster) {
            enhancedMovie.poster = poster;
          }
        } catch (err) {
          console.error(`Error fetching poster for ${movieDetails.title}:`, err);
        }
      } else {
        // Use TMDB poster path
        enhancedMovie.poster = `https://image.tmdb.org/t/p/w500${movieDetails.poster_path}`;
      }
      
      return enhancedMovie;
    } catch (error) {
      console.error(`Error fetching movie ${item.movie_id}:`, error);
      return null;
    }
  });
  
  const detailedMovies = await Promise.all(moviePromises);
  return detailedMovies.filter(Boolean);
};

