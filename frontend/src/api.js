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
  
    const moviePromises = watchedData.map((item) =>
      fetchMovieDetails(item.movie)
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