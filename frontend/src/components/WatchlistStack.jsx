import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const WatchlistStack = ({ title = "Your Watchlist" }) => {
  const [movies, setMovies] = useState([]);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState({}); // for add-to-watchlist button
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWatchlistMovies = async () => {
      try {
        const response = await fetch("http://localhost:8000/watchlist_items/", {
          credentials: "include",
        });
        const data = await response.json();
        if (response.ok && data.status === "success") {
          const moviePromises = data.watchlist.map((item) =>
            fetch(`http://localhost:8000/search/?id=${item.movie_id}`, {
              credentials: "include",
            })
              .then((res) => res.json())
              .then((movieData) => {
                if (movieData.movies && movieData.movies.length > 0) {
                  return movieData.movies[0];
                }
                return null;
              })
          );
          const detailedMovies = await Promise.all(moviePromises);
          const validMovies = detailedMovies.filter((movie) => movie !== null);

          // For movies without a valid poster, fetch poster from /movie_poster/
          const updatedMovies = await Promise.all(
            validMovies.map(async (movie) => {
              if (!movie.poster_path || movie.poster_path === "N/A") {
                try {
                  const posterResponse = await fetch(
                    "http://localhost:8000/movie_poster/?title=" +
                      encodeURIComponent(movie.title || movie.original_title),
                    { credentials: "include" }
                  );
                  const posterData = await posterResponse.json();
                  if (posterData.poster) {
                    return { ...movie, poster_path: posterData.poster };
                  }
                } catch (err) {
                  console.error("Error fetching poster for", movie.title, err);
                }
              }
              return movie;
            })
          );

          setMovies(updatedMovies);
          // Set the initial index for infinite scrolling (if there are enough movies)
          // (Not used in this stack, but part of the component's code)
        } else {
          setMessage({
            text: data.message || "Failed to fetch watchlist items.",
            type: "error",
          });
        }
      } catch (err) {
        console.error("Error fetching watchlist items:", err);
        setMessage({ text: "Error fetching watchlist items.", type: "error" });
      }
    };

    fetchWatchlistMovies();
  }, []);

  const addToWatchlist = async (movie) => {
    const titleParam = movie.title || movie.original_title;
    if (!titleParam) {
      setMessage({ text: "Invalid movie title.", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    const releaseDate = movie.release_date || "";
    const releaseYear = releaseDate ? releaseDate.split("-")[0] : "";

    setLoading((prev) => ({ ...prev, [movie.id]: true }));
    try {
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
        throw new Error("Failed to search");
      }
      const searchData = await searchResponse.json();
      if (searchData.error) {
        throw new Error(searchData.error);
      }
      if (!searchData.movies || searchData.movies.length === 0) {
        throw new Error("Movie not found in search.");
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
        const addData = await addResponse.json();
        throw new Error(addData.error || "An error occurred.");
      }
      const addData = await addResponse.json();
      setMessage({
        text: addData.message || "Movie added to watchlist!",
        type: "success",
      });
    } catch (err) {
      console.error("Failed to add movie to watchlist:", err);
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading((prev) => ({ ...prev, [movie.id]: false }));
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleMovieClick = (movie) => {
    const titleParam = encodeURIComponent(movie.title || movie.original_title);
    const releaseDate = movie.release_date;
    if (releaseDate) {
      navigate(`/movie/${titleParam}?release_date=${encodeURIComponent(releaseDate)}`);
    } else {
      navigate(`/movie/${titleParam}`);
    }
  };

  // Limit to 5 movies for the stack display
  const moviesToShow = movies.slice(0, 5);

  if (movies.length === 0) {
    return <div>Loading watchlist movies...</div>;
  }

  // Updated inline CSS with larger title font size.
  const styles = `
    .watchlist-stack {
      width: 40vh;
      height: 74vh;
      margin: 0 auto;
      background-color: #240046;
      padding: 10px;
      box-sizing: border-box;
      color: #fff;
      overflow: hidden;
      border-radius: 8px;
    }
    .watchlist-stack h2 {
      font-size: 1.3rem; /* Increased from 1rem */
      margin-bottom: 10px;
      text-align: center;
    }
    /* Grid: 3 rows, 2 columns, last item spans both columns */
    .movies-stack {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr 1fr;
      gap: 20px;
      height: calc(100% - 30px);
      padding-bottom: 20px;
    }
    .movie-item {
      position: relative;
      text-align: center;
      overflow: hidden;
      border-radius: 6px;
    }
    .movie-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      cursor: pointer;
    }
    .movie-title {
      position: absolute;
      bottom: 2px;
      left: 0;
      right: 0;
      font-size: 0.7rem;
      text-align: center;
      background: rgba(0,0,0,0.4);
      color: #fff;
      padding: 2px;
      border-radius: 0 0 6px 6px;
    }
    .movie-item.last {
      grid-column: 1 / 3;
    }
    .add-button {
      position: absolute;
      top: 5px;
      right: 5px;
      background-color: rgba(255,255,255,0.8);
      border: none;
      border-radius: 50%;
      width: 25px;
      height: 25px;
      font-size: 14px;
      font-weight: bold;
      color: #333;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.3s, transform 0.3s;
      z-index: 2;
    }
    .add-button:hover {
      background-color: rgba(255,255,255,1);
      transform: scale(1.1);
    }
    .message {
      text-align: center;
      margin-bottom: 5px;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 0.85rem;
    }
    .message.error {
      background-color: #f44336;
      color: #fff;
    }
    .message.success {
      background-color: #4caf50;
      color: #fff;
    }
  `;

  return (
    <div className="watchlist-stack">
      <style>{styles}</style>
      <h2>{title}</h2>
      {message && (
        <div className={`message ${message.type === "error" ? "error" : "success"}`}>
          {message.text}
        </div>
      )}
      <div className="movies-stack">
        {moviesToShow.map((movie, index) => (
          <div key={movie.id} className={`movie-item ${index === 4 ? "last" : ""}`}>
            <img
              onClick={() => handleMovieClick(movie)}
              src={
                movie.poster_path
                  ? movie.poster_path.startsWith("http")
                    ? movie.poster_path
                    : `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                  : "https://via.placeholder.com/200x300?text=No+Image"
              }
              alt={movie.title || movie.original_title}
            />
            <button
              className="add-button"
              onClick={() => addToWatchlist(movie)}
              title="Add to Watchlist"
              aria-label={`Add ${movie.title || movie.original_title} to Watchlist`}
              disabled={loading[movie.id]}
            >
              {loading[movie.id] ? "..." : "+"}
            </button>
            <div className="movie-title">
              {movie.title || movie.original_title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WatchlistStack;
