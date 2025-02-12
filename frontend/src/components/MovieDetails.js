import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const MovieDetails = () => {
  const { id } = useParams();  // Get movie ID from URL

  const [movie, setMovie] = useState(null);
  const [posterURL, setPosterURL] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [loadingAdd, setLoadingAdd] = useState(false); 
  const [message, setMessage] = useState(null);

  // 1) Fetch movie details by ID, fallback to OMDB API search if not found
  useEffect(() => {
    const fetchMovieById = async () => {
      try {
        const response = await fetch(`http://localhost:8000/search?id=${id}`);
        const data = await response.json();

        if (response.ok && data.movies && data.movies.length > 0) {
          setMovie(data.movies[0]);
        } else {
          console.warn("No movie found by ID. Attempting OMDB search...");
          await fetchFromOMDB(id);  // Fallback to OMDB search
        }
      } catch (err) {
        console.error('Error fetching from local DB:', err);
        await fetchFromOMDB(id);  // If local fetch fails, try OMDB directly
      } finally {
        setLoading(false);
      }
    };

    const fetchFromOMDB = async (movieId) => {
      try {
        // Attempt OMDB search directly using the movie title or ID
        const omdbResponse = await fetch(`http://localhost:8000/api_search/?q=${movieId}`);
        const omdbData = await omdbResponse.json();

        if (omdbResponse.ok && omdbData.Title) {
          // Update the movie details using the OMDB response
          setMovie({
            title: omdbData.Title,
            year: omdbData.Year,
            runtime: omdbData.Runtime,
            rating: omdbData.Rated,
            plot: omdbData.Plot,
            director: omdbData.Director,
            id: movieId,  // Maintain the original movie ID
          });
        } else {
          throw new Error(omdbData.error || "OMDB search did not find any results.");
        }
      } catch (err) {
        console.error('Error in OMDB search:', err);
        setError("No movie found by ID or via OMDB search.");
      }
    };

    fetchMovieById();
  }, [id]);

  // 2) Fetch the poster
  useEffect(() => {
    if (!movie || !movie.title) return;

    const fetchPoster = async () => {
      try {
        const encodedTitle = encodeURIComponent(movie.title);
        const response = await fetch(`http://localhost:8000/movie_poster/?title=${encodedTitle}`);
        const data = await response.json();
        if (data.poster) {
          setPosterURL(data.poster);
        }
      } catch (error) {
        console.error("Failed to fetch poster:", error);
      }
    };

    fetchPoster();
  }, [movie]);

  // 3) Add movie to watchlist
  const addToWatchlist = async (movieId) => {
    if (!movieId) {
      setMessage({ text: "Invalid movie ID.", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setLoadingAdd(true);

    try {
      const response = await fetch(`http://localhost:8000/add_movie/?movie_id=${movieId}`, {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ text: data.message || "Movie added to watchlist!", type: "success" });
      } else {
        setMessage({ text: data.error || "An error occurred.", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Failed to add movie to watchlist.", type: "error" });
    } finally {
      setLoadingAdd(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) return <div style={{ color: "#fff" }}>Loading movie details...</div>;
  if (error) return <div style={{ color: "#fff" }}>Error: {error}</div>;
  if (!movie) return <div style={{ color: "#fff" }}>No movie details found.</div>;

  return (
    <div style={styles.container}>
      {message && (
        <div style={{ ...styles.message, backgroundColor: message.type === "success" ? "#4caf50" : "#f44336" }}>
          {message.text}
        </div>
      )}
      <h1 style={styles.title}>{movie.title}</h1>
      <div style={styles.detailsWrapper}>
        <div style={styles.posterContainer}>
          <img
            src={posterURL ? posterURL : "https://via.placeholder.com/300x450?text=No+Image"}
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
          <p><strong>Release Year:</strong> {movie.year}</p>
          <p><strong>Rating:</strong> {movie.rating}</p>
          <p><strong>Runtime:</strong> {movie.runtime}</p>
          <p><strong>Director:</strong> {movie.director}</p>
        </div>
      </div>
    </div>
  );
};

export default MovieDetails;

// Inline styles
const styles = {
  container: { padding: "20px", color: "#fff", backgroundColor: "#240046" },
  message: { padding: "10px", marginBottom: "20px", color: "#fff", borderRadius: "4px", textAlign: "center" },
  title: { textAlign: "center", margin: "0 0 20px 350px" },
  detailsWrapper: { display: "flex", alignItems: "flex-start", gap: "20px", marginTop: "20px" },
  posterContainer: { position: "relative", width: "300px", height: "444px", margin: "0 0 20px 50px", flexShrink: 0 },
  poster: { width: "100%", height: "100%", borderRadius: "6px", objectFit: "cover" },
  addButton: { position: "absolute", top: "10px", right: "10px", backgroundColor: "#fff", border: "none", color: "#000", cursor: "pointer", fontSize: "24px", width: "40px", height: "40px", borderRadius: "50%", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" },
  info: { flex: 1 },
};
