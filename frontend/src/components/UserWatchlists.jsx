import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchWatchlistMovies } from "../api";

const UserWatchlists = () => {
  const navigate = useNavigate();

  const { data: movies = [], isLoading: loadingMovies, error } = useQuery({
    queryKey: ['watchlistMovies'],
    queryFn: fetchWatchlistMovies,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  // Sort movies by date added (most recent first)
  const sortedMovies = React.useMemo(() => {
    if (!movies.length) return [];
    
    return [...movies].sort((a, b) => {
      // Use added_at field for sorting
      const dateA = a.added_at;
      const dateB = b.added_at;
      
      // Sort by date (most recent first)
      return new Date(dateB) - new Date(dateA);
    });
  }, [movies]);

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
    if (movie.poster) {
      return movie.poster;
    }
    if (movie.poster_path && movie.poster_path !== "N/A") {
      return `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
    }
    return "https://via.placeholder.com/250x375?text=No+Image";
  };

  if (loadingMovies) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading watchlist movies...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          Error loading watchlist: {error.message}
        </div>
      </div>
    );
  }

  if (!sortedMovies.length) {
    return (
      <div style={styles.container}>
        <h1 style={styles.pageTitle}>Your Watchlist</h1>
        <div style={styles.emptyMessage}>No movies in your watchlist.</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.pageTitle}>Your Watchlist</h1>
      <div style={styles.grid}>
        {sortedMovies.map((movie, index) => (
          <div
            key={`${movie.id}-${index}`}
            style={styles.card}
            className="movie-card"
            onClick={() => handleMovieClick(movie)}
          >
            <img
              src={getPosterUrl(movie)}
              alt={movie.title || movie.original_title}
              style={styles.poster}
            />
            <div style={styles.info}>
              <h2 style={styles.title}>{movie.title || movie.original_title}</h2>
              {movie.release_date && (
                <p style={styles.releaseDate}>
                  {new Date(movie.release_date).getFullYear()}
                </p>
              )}
              {movie.added_at && (
                <p style={styles.dateAdded}>
                  Added {new Date(movie.added_at).toLocaleDateString()}
                </p>
              )}
              {movie.overview && (
                <p style={styles.overview}>
                  {movie.overview.length > 150 
                    ? `${movie.overview.substring(0, 150)}...` 
                    : movie.overview
                  }
                </p>
              )}
              {movie.vote_average && (
                <p style={styles.rating}>
                  ⭐ {movie.vote_average.toFixed(1)}/10
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      <style>{`
        a { text-decoration: none; color: inherit; }
        .movie-card:hover { transform: scale(1.02); }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: "#1D0037",
    backgroundImage: "radial-gradient(circle at center center, rgb(87,0,108),rgb(16,0,43))",
    minHeight: "100vh",
    padding: "80px 80px",
    color: "#fff",
  },
  pageTitle: {
    fontSize: "3rem",
    marginBottom: "40px",
    textAlign: "center",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: "30px",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "rgba(36,0,70,0.95)",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 6px 16px rgba(0,0,0,0.6)",
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  poster: {
    width: "100%",
    height: "auto",
    objectFit: "cover",
    aspectRatio: "2/3",
  },
  info: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  title: {
    margin: 0,
    fontSize: "1.5rem",
    marginBottom: "8px",
  },
  releaseDate: {
    fontSize: "1rem",
    color: "#ffcc00",
    margin: "4px 0 8px 0",
    fontWeight: "500",
  },
  dateAdded: {
    fontSize: "0.9rem",
    color: "#aaa",
    margin: "4px 0 8px 0",
  },
  overview: {
    flexGrow: 1,
    color: "#e0e0e0",
    marginBottom: "12px",
    fontSize: "1rem",
    lineHeight: 1.4,
  },
  rating: {
    fontSize: "0.9rem",
    color: "#aaa",
    margin: "4px 0 0 0",
  },
  loading: {
    textAlign: "center",
    padding: "80px",
    fontSize: "1.4rem",
    color: "#ccc",
  },
  error: {
    textAlign: "center",
    padding: "80px",
    fontSize: "1.4rem",
    color: "#ff6b6b",
  },
  emptyMessage: {
    textAlign: "center",
    padding: "40px",
    fontSize: "1.2rem",
    color: "#ccc",
  },
};

export default UserWatchlists;