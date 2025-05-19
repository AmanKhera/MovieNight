import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const UserWatchlists = () => {
  const [movies, setMovies] = useState([]);
  const [message, setMessage] = useState(null);
  const [loadingMovies, setLoadingMovies] = useState(true);

  const navigate = useNavigate();

  // Fetch the user's watchlist items and then get each movie's details using the movie_id.
  // For each valid movie, fetch the poster from the Movie_Poster endpoint.
  useEffect(() => {
    const fetchWatchlistMovies = async () => {
      try {
        const response = await fetch("http://localhost:8000/watchlist_items/", {
          credentials: "include",
        });
        const data = await response.json();
        if (response.ok && data.status === "success") {
          // For each watchlist item, fetch movie details using its movie_id.
          const moviePromises = data.watchlist.map((item) =>
            fetch(`http://localhost:8000/search/?id=${item.movie_id}`, {
              credentials: "include",
            })
              .then((res) => res.json())
              .then((movieData) =>
                movieData.movies && movieData.movies.length > 0
                  ? movieData.movies[0]
                  : null
              )
          );
          const detailedMovies = await Promise.all(moviePromises);
          const validMovies = detailedMovies.filter((movie) => movie !== null);

          // Now fetch poster for each movie using the Movie_Poster endpoint.
          const moviesWithPosters = await Promise.all(
            validMovies.map(async (movie) => {
              try {
                const posterRes = await fetch(
                  `http://localhost:8000/movie_poster/?title=${encodeURIComponent(
                    movie.title || movie.original_title
                  )}`,
                  { credentials: "include" }
                );
                const posterData = await posterRes.json();
                if (posterRes.ok && posterData.poster) {
                  return { ...movie, poster: posterData.poster };
                }
                return { ...movie };
              } catch (err) {
                console.error("Error fetching poster for:", movie.title, err);
                return { ...movie };
              }
            })
          );
          setMovies(moviesWithPosters);
        } else {
          setMessage({
            text: data.message || "Failed to fetch watchlist items.",
            type: "error",
          });
        }
      } catch (err) {
        console.error("Error fetching watchlist items:", err);
        setMessage({ text: "Error fetching watchlist items.", type: "error" });
      } finally {
        setLoadingMovies(false);
      }
    }; 

    fetchWatchlistMovies();
  }, []);

  // When a movie is clicked, navigate to its details page.
  const handleMovieClick = (movie) => {
    const titleParam = encodeURIComponent(movie.title || movie.original_title);
    const releaseDate = movie.release_date;
    if (releaseDate) {
      navigate(`/movie/${titleParam}?release_date=${encodeURIComponent(releaseDate)}`);
    } else {
      navigate(`/movie/${titleParam}`);
    }
  };

  // Helper function to determine the correct poster URL.
  // It checks if the movie object has a poster (fetched from Movie_Poster),
  // otherwise it falls back to a placeholder.
  const getPosterUrl = (movie) => {
    if (movie.poster) {
      return movie.poster;
    }
    return "https://via.placeholder.com/200x300?text=No+Image";
  };

  // Inline CSS styles for a grid layout with 6 movies per row.
  const styles = `
    .watchlist-container {
      width: 100vw;
      margin: 0 auto;
      background-color: #240046;
      color: #fff;
      padding: 20px;
      box-sizing: border-box;
    }
    .watchlist-container h2 {
      font-size: 1.8rem;
      margin-left: 1%;
      margin-bottom: 10px;
    }
    .message {
      position: relative;
      margin-bottom: 20px;
      padding: 10px 20px;
      background-color: #4caf50;
      color: white;
      border-radius: 5px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      text-align: center;
    }
    .message.error {
      background-color: #f44336;
    }
    /* Grid container: 6 columns, wrapping to new rows as needed */
    .movies-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 20px;
      justify-items: center;
    }
    .movie-item {
      width: 180px;
      cursor: pointer;
      text-align: center;
    }
    .movie-item .poster {
      width: 100%;
      height: 270px;
      border-radius: 8px;
      overflow: hidden;
      background-color: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .movie-item .poster img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    .movie-item .poster img:hover {
      transform: scale(1.05);
    }
    .movie-title {
      font-size: 1rem;
      margin-top: 8px;
      line-height: 1.2;
      min-height: 2.4em;
    }
  `;

  if (loadingMovies) {
    return (
      <div className="watchlist-container">
        <style>{styles}</style>
        <div>Loading watchlist movies...</div>
      </div>
    );
  }

  if (!movies.length) {
    return (
      <div className="watchlist-container">
        <style>{styles}</style>
        <h2>Your Watchlist</h2>
        <div>No movies in your watchlist.</div>
      </div>
    );
  }

  return (
    <div className="watchlist-container">
      <style>{styles}</style>
      <h2>Your Watchlist</h2>
      {message && (
        <div className={`message ${message.type === "error" ? "error" : ""}`}>
          {message.text}
        </div>
      )}
      <div className="movies-grid">
        {movies.map((movie, index) => (
          <div
            className="movie-item"
            key={`${movie.id}-${index}`}
            onClick={() => handleMovieClick(movie)}
          >
            <div className="poster">
              <img
                src={getPosterUrl(movie)}
                alt={movie.title || movie.original_title}
              />
            </div>
            <div className="movie-title">
              {movie.title || movie.original_title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserWatchlists;
