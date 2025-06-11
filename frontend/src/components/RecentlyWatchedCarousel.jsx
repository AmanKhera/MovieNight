import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchRecentlyWatched } from "../api";
import { queryClient } from "../App";

const RecentlyWatchedCarousel = ({ title = "Recently Watched" }) => {
  const navigate = useNavigate();

  const { data: movies, isLoading, isError, error } = useQuery({
    queryKey: ["recentlyWatched"],
    queryFn: fetchRecentlyWatched,
    staleTime: 3600000,
    refetchOnMount: false,
    initialData: () => queryClient.getQueryData(["recentlyWatched"]),
  });

  const handleMovieClick = (movie) => {
    const titleParam = encodeURIComponent(movie.title || movie.original_title);
    const releaseDate = movie.release_date;
    if (releaseDate) {
      navigate(`/movie/${titleParam}?release_date=${encodeURIComponent(releaseDate)}`);
    } else {
      navigate(`/movie/${titleParam}`);
    }
  };

  const getPosterUrl = (movie) => {
    if (movie.poster) return movie.poster;
    if (movie.poster_path) {
      return movie.poster_path.startsWith("http")
        ? movie.poster_path
        : `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
    }
    return "https://via.placeholder.com/200x300?text=No+Image";
  };

  if (isLoading) return <div>Loading recently watched movies...</div>;
  if (isError) return <div>Error: {error.message}</div>;
  if (!movies || movies.length === 0) return <div>No recently watched movies found.</div>;

  return (
    <div className="watchlist-carousel">
      <h2>{title}</h2>
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
    </div>
  );
};

export default RecentlyWatchedCarousel;