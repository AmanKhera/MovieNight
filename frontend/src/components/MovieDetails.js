import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const MovieDetails = () => {
  // Using 'id' from the URL params
  const { id } = useParams();

  const [movie, setMovie] = useState(null);
  const [posterURL, setPosterURL] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1) Fetch movie details by ID using the new search endpoint
  useEffect(() => {
    const fetchMovieById = async () => {
      try {
        // According to your new backend, searching by ID means passing `id=`
        // Example: /search?id=123
        const response = await fetch(`http://localhost:8000/search?id=${id}`);
        if (!response.ok) {
          throw new Error(
            `Error fetching movie details (Status: ${response.status})`
          );
        }

        const data = await response.json();

        // The new endpoint returns something like:
        // {
        //   "movies": [...]
        //   "users": [...]
        //   ...
        // }
        if (!data.movies || data.movies.length === 0) {
          setError("No movie found by that ID.");
          return;
        }

        // Take the first match (assuming only one movie per ID)
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

  // 2) Optionally fetch the poster via OMDB (or your own poster logic)
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
      <h1>{movie.title}</h1>
      <div style={styles.detailsWrapper}>
        <img
          src={
            posterURL
              ? posterURL
              : "https://via.placeholder.com/300x450?text=No+Image"
          }
          alt={movie.title}
          style={styles.poster}
        />
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
    maxWidth: "900px",
    margin: "0 auto",
    padding: "20px",
    color: "#fff",
    backgroundColor: "transparent",
  },
  detailsWrapper: {
    display: "flex",
    gap: "20px",
    marginTop: "20px",
  },
  poster: {
    width: "300px",
    borderRadius: "6px",
    objectFit: "cover",
  },
  info: {
    flex: 1,
  },
};
