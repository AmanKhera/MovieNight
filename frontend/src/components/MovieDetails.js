import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const MovieDetails = () => {
  const { id } = useParams(); // Movie ID from the URL
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch movie details
  useEffect(() => {
    const fetchMovie = async () => {
      try {
        // Adjust this endpoint if needed to match your backend route
        const response = await fetch(`http://localhost:8000/movie/${id}`);
        if (!response.ok) {
          throw new Error(`Error fetching movie details (Status: ${response.status})`);
        }
        const data = await response.json();
        setMovie(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [id]);

  if (loading) {
    return <div>Loading movie details...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!movie) {
    return <div>No movie details found.</div>;
  }

  return (
    <div style={styles.container}>
      <h1>{movie.title || movie.original_title}</h1>
      <div style={styles.detailsWrapper}>
        <img
          src={
            movie.poster_path
              ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
              : "https://via.placeholder.com/300x450?text=No+Image"
          }
          alt={movie.title || movie.original_title}
          style={styles.poster}
        />
        <div style={styles.info}>
          <h2>Overview</h2>
          <p>{movie.overview}</p>
          <p><strong>Release Date:</strong> {movie.release_date}</p>
          <p><strong>Rating:</strong> {movie.vote_average}</p>
          {/* Add any other fields you want to display */}
        </div>
      </div>
    </div>
  );
};

export default MovieDetails;

// Some basic inline styles you can replace with a CSS module or styled-components
const styles = {
  container: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "20px",
  },
  detailsWrapper: {
    display: "flex",
    gap: "20px",
    marginTop: "20px",
  },
  poster: {
    width: "300px",
    borderRadius: "6px",
  },
  info: {
    flex: 1,
  },
};
