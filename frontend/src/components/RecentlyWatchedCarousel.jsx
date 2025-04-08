import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const RecentlyWatchedCarousel = ({ title = "Recently Watched" }) => {
  const [movies, setMovies] = useState([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [message, setMessage] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserIdAndMovies = async () => {
      try {
        // 1) Get the user info (which includes user.id)
        const userInfoRes = await fetch("http://localhost:8000/user_info/", {
          credentials: "include",
        });
        const userInfoData = await userInfoRes.json();

        if (!userInfoRes.ok || !userInfoData.id) {
          setMessage({
            text: userInfoData.error || "Failed to fetch user info.",
            type: "error",
          });
          setLoadingMovies(false);
          return;
        }

        const userId = userInfoData.id;

        // 2) Fetch recently watched using the retrieved user ID
        const response = await fetch(
          `http://localhost:8000/recently_watched/?user_id=${userId}`,
          { credentials: "include" }
        );
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

        // Only take the first 7 movies
        setMovies(moviesWithPosters.slice(0, 7));
      } catch (err) {
        console.error("Error fetching recently watched movies:", err);
        setMessage({
          text: "Error fetching recently watched movies.",
          type: "error",
        });
      } finally {
        setLoadingMovies(false);
      }
    };

    fetchUserIdAndMovies();
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

      <div className="movies-row">
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
              <div className="title-overlay">
                <div className="overlay-title">
                  {movie.title || movie.original_title}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inline CSS */}
      <style>{`
        .watchlist-carousel {
          width: 100%;
          margin: 0 auto;
          background-color: #240046;
          color: #fff;
          padding: 5px 20px 30px 20px;
          box-sizing: border-box;
        }
        .watchlist-carousel h2 {
          font-size: 1.8rem;
          margin: 0 0 8px 0;
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

        /* Layout for the row of posters (no horizontal scrollbar) */
        .movies-row {
          display: flex;
          flex-wrap: wrap; /* Allow wrapping if screen is too narrow */
          gap: 10px;
          justify-content: space-between;
        }

        /* Each movie item takes up roughly 1/7 of the row */
        .movie-item {
          flex: 1 1 calc(100% / 7 - 10px);
          box-sizing: border-box;
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
        .title-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          padding: 5px;
          box-sizing: border-box;
          background: rgba(0, 0, 0, 0.5);
          text-align: center;
        }
        .overlay-title {
          font-size: 0.9rem;
          margin: 0;
          color: #fff;
        }
      `}</style>
    </div>
  );
};

export default RecentlyWatchedCarousel;
