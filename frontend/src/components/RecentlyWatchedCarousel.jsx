import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const RecentlyWatchedCarousel = ({ title = "Recently Watched" }) => {
  const [movies, setMovies] = useState([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [message, setMessage] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecentlyWatched = async () => {
      try {
        const response = await fetch("http://localhost:8000/recently_watched/", {
          credentials: "include",
        });
        const data = await response.json();

        if (!response.ok) {
          setMessage({
            text: data.message || "Failed to fetch recently watched movies.",
            type: "error",
          });
          setLoadingMovies(false);
          return;
        }

        // For each watched item, fetch its movie details
        const moviePromises = data.map((item) =>
          fetch(`http://localhost:8000/search/?id=${item.movie}`, {
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
        const validMovies = detailedMovies.filter((m) => m !== null);

        // For any movie missing a poster, fetch from movie_poster endpoint
        const moviesWithPosters = await Promise.all(
          validMovies.map(async (movie) => {
            if (!movie.poster_path || movie.poster_path === "N/A") {
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
              } catch (err) {
                console.error("Error fetching poster for:", movie.title, err);
              }
            }
            return movie;
          })
        );

        // Only take the first 7 movies, like WatchlistCarousel
        setMovies(moviesWithPosters.slice(0, 7));
      } catch (err) {
        console.error("Error fetching recently watched movies:", err);
        setMessage({ text: "Error fetching recently watched movies.", type: "error" });
      } finally {
        setLoadingMovies(false);
      }
    };

    fetchRecentlyWatched();
  }, []);

  // Navigate to the movie details page
  const handleMovieClick = (movie) => {
    const titleParam = encodeURIComponent(movie.title || movie.original_title);
    const releaseDate = movie.release_date;
    if (releaseDate) {
      navigate(`/movie/${titleParam}?release_date=${encodeURIComponent(releaseDate)}`);
    } else {
      navigate(`/movie/${titleParam}`);
    }
  };

  // Helper to get the final poster URL
  const getPosterUrl = (movie) => {
    if (movie.poster) {
      return movie.poster;
    }
    if (movie.poster_path) {
      return movie.poster_path.startsWith("http")
        ? movie.poster_path
        : `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
    }
    return "https://via.placeholder.com/200x300?text=No+Image";
  };

  // If fewer than 7 movies, use natural sizing & left-align them.
  // If 7 or more, stretch them evenly across the row.
  const movieItemStyle =
    movies.length >= 7
      ? { flex: "0 0 calc(100% / 7 - 10px)" }
      : { flex: "0 0 auto" };

  const moviesRowStyle =
    movies.length >= 7
      ? { justifyContent: "space-between" }
      : { justifyContent: "flex-start" };

  if (loadingMovies) {
    return <div>Loading recently watched movies...</div>;
  }

  if (!loadingMovies && movies.length === 0) {
    return <div>No recently watched movies found.</div>;
  }

  return (
    <div className="watchlist-carousel">
      <h2>{title}</h2>
      {message && <div className={`message ${message.type}`}>{message.text}</div>}

      <div className="movies-row" style={moviesRowStyle}>
        {movies.map((movie, index) => (
          <div
            className="movie-item"
            key={`${movie.id}-${index}`}
            style={movieItemStyle}
            onClick={() => handleMovieClick(movie)}
          >
            {/* Poster container */}
            <div className="poster">
              <img src={getPosterUrl(movie)} alt={movie.title || movie.original_title} />
              {/* Semi-transparent bar overlay with the movie title */}
              <div className="title-overlay">
                <div className="overlay-title">
                  {movie.title || movie.original_title}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inline CSS (matching the WatchlistCarousel, but with a rectangular overlay for the title) */}
      <style>{`
        .watchlist-carousel {
          width: 100%;
          margin: 0 auto;
          background-color: #240046;
          color: #fff;
          /* Reduced top padding and increased bottom padding */
          padding: 5px 20px 30px 20px;
          box-sizing: border-box;
        }
        .watchlist-carousel h2 {
          font-size: 1.8rem;
          margin: 0 0 8px 0; /* No top margin, small bottom margin */
          text-align: center;
        }
        .message {
          margin-bottom: 20px;
          padding: 10px 20px;
          border-radius: 5px;
          text-align: center;
        }
        .message.error {
          background-color: #f44336;
          color: white;
        }
        /* Single row layout (up to 7 movies) */
        .movies-row {
          display: flex;
          flex-wrap: nowrap;
          gap: 10px;
          /* We handle justification dynamically via inline style */
        }
        .movie-item {
          cursor: pointer;
          text-align: center;
        }
        .poster {
          position: relative;
          width: 100%;
          height: 220px;
          border-radius: 8px;
          overflow: hidden;
          background-color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .poster img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .poster img:hover {
          transform: scale(1.05);
        }
        /* Rectangular bar overlay at the bottom of the poster */
        .title-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          padding: 5px;
          box-sizing: border-box;
          background: rgba(0, 0, 0, 0.5); /* Semi-transparent dark bar */
          text-align: center; /* or left, if you prefer */
        }
        .overlay-title {
          font-size: 0.9rem;
          margin: 0;
          color: #fff; /* ensure text is white on dark overlay */
        }
      `}</style>
    </div>
  );
};

export default RecentlyWatchedCarousel;
