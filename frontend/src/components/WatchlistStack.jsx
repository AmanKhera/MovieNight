// src/components/WatchlistStack.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchWatchlistMovies, addToWatchlistAPI } from "../api";

const WatchlistStack = ({ title = "Your Watchlist" }) => {
  const navigate = useNavigate();
  const { data: movies, isLoading, error } = useQuery({
    queryKey: ["watchlistMovies"],
    queryFn: fetchWatchlistMovies,
  });

  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState({}); // for add-to-watchlist button

  const addToWatchlist = async (movie) => {
    const titleParam = movie.title || movie.original_title;
    if (!titleParam) {
      setMessage({ text: "Invalid movie title.", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setLoading((prev) => ({ ...prev, [movie.id]: true }));
    try {
      const addData = await addToWatchlistAPI(movie);
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
      navigate(
        `/movie/${titleParam}?release_date=${encodeURIComponent(releaseDate)}`
      );
    } else {
      navigate(`/movie/${titleParam}`);
    }
  };

  // Helper function to return the correct poster URL
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

  // Limit to 5 movies for the stack display
  const moviesToShow = movies ? movies.slice(0, 5) : [];

  if (isLoading) {
    return <div>Loading watchlist movies...</div>;
  }

  if (error) {
    return <div className="message error">Error: {error.message}</div>;
  }

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
      font-size: 1.3rem;
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
              src={getPosterUrl(movie)}
              alt={movie.title || movie.original_title}
            />
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
