import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const MovieDetails = () => {
  // Using 'id' from the URL params
  const { id } = useParams();

  const [movie, setMovie] = useState(null);
  const [posterURL, setPosterURL] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Watchlist states for adding the movie
  const [loadingAdd, setLoadingAdd] = useState(false); 
  const [message, setMessage] = useState(null);        // For watchlist feedback

  // 1) Fetch movie details by ID
  useEffect(() => {
    const fetchMovieById = async () => {
      try {
        const response = await fetch(`http://localhost:8000/search?id=${id}`);
        if (!response.ok) {
          throw new Error(
            `Error fetching movie details (Status: ${response.status})`
          );
        }

        const data = await response.json();
        if (!data.movies || data.movies.length === 0) {
          setError("No movie found by that ID.");
          return;
        }

        const [foundMovie] = data.movies;
        setMovie(foundMovie);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMovieById();
  }, [id]);

  // 2) Optionally fetch the poster
  useEffect(() => {
    if (!movie || !movie.title) return;

    const fetchPoster = async () => {
      try {
        const encodedTitle = encodeURIComponent(movie.title);
        const response = await fetch(
          `http://localhost:8000/movie_poster/?title=${encodedTitle}`
        );

        if (!response.ok) {
          console.error("Poster fetch failed:", response.status);
          return;
        }

        const data = await response.json();
        if (data.error) {
          console.error("Poster error:", data.error);
          return;
        }

        setPosterURL(data.poster);
      } catch (error) {
        console.error("Failed to fetch poster:", error);
      }
    };

    fetchPoster();
  }, [movie]);

  // 3) Function to add movie to watchlist
  const addToWatchlist = async (movieId) => {
    if (!movieId) {
      setMessage({ text: "Invalid movie ID.", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setLoadingAdd(true);

    try {
      const params = new URLSearchParams({ movie_id: movieId });
      // Example:  http://localhost:8000/add_movie/?movie_id=123
      const response = await fetch(
        `http://localhost:8000/add_movie/?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data = await response.json();
      if (response.ok) {
        setMessage({
          text: data.message || "Movie added to watchlist!",
          type: "success",
        });
      } else {
        setMessage({ text: data.error || "An error occurred.", type: "error" });
      }
    } catch (err) {
      console.error("Error adding movie to watchlist:", err);
      setMessage({ text: "Failed to add movie to watchlist.", type: "error" });
    } finally {
      setLoadingAdd(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) {
    return <div style={{ color: "#fff" }}>Loading movie details...</div>;
  }

  if (error) {
    return <div style={{ color: "#fff" }}>Error: {error}</div>;
  }

  if (!movie) {
    return <div style={{ color: "#fff" }}>No movie details found.</div>;
  }

  return (
    <div style={styles.container}>
      {/* Optional watchlist message/feedback */}
      {message && (
        <div
          style={{
            ...styles.message,
            backgroundColor: message.type === "success" ? "#4caf50" : "#f44336",
          }}
        >
          {message.text}
        </div>
      )}

      <h1 style={styles.title}>{movie.title}</h1>
      <div style={styles.detailsWrapper}>
        {/* Poster container with a button on top */}
        <div style={styles.posterContainer}>
          <img
            src={
              posterURL
                ? posterURL
                : "https://via.placeholder.com/300x450?text=No+Image"
            }
            alt={movie.title}
            style={styles.poster}
          />
          <button
            style={styles.addButton}
            onClick={() => addToWatchlist(movie.id)}
            disabled={loadingAdd}
            title="Add to Watchlist"
          >
            {loadingAdd ? "..." : "+"}
          </button>
        </div>

        <div style={styles.info}>
          <h2>Plot</h2>
          <p>{movie.plot}</p>
          <p>
            <strong>Release Year:</strong> {movie.year}
          </p>
          <p>
            <strong>Rating:</strong> {movie.rating}
          </p>
          <p>
            <strong>Runtime:</strong> {movie.runtime} minutes
          </p>
          <p>
            <strong>Director:</strong> {movie.director}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MovieDetails;

// Inline styles
const styles = {
  container: {
    padding: "20px",
    color: "#fff",
    backgroundColor: "transparent",
  },
  message: {
    padding: "10px",
    marginBottom: "20px",
    color: "#fff",
    borderRadius: "4px",
    textAlign: "center",
  },
  title: {
    textAlign: "center",
    margin: "0 0 20px 350px",
  },
  detailsWrapper: {
    display: "flex",
    alignItems: "flex-start",
    gap: "20px",
    marginTop: "20px",
  },
  // Poster container holds the image + the plus button
  posterContainer: {
    position: "relative",
    width: "300px", // same as poster width
    height: "444px", // same as poster height
    margin: "0 0 20px 50px",
    flexShrink: 0,
  },
  poster: {
    width: "100%",
    height: "100%",
    borderRadius: "6px",
    objectFit: "cover",
  },
  // Overlay button for watchlist
  addButton: {
    position: "absolute",
    top: "10px",
    right: "10px",
    zIndex: 2,
    backgroundColor: "#fff",
    border: "none",
    color: "#000",
    cursor: "pointer",
    fontSize: "24px",
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
  },
  info: {
    flex: 1,
  },
};
