import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";

const MovieDetailsPage = () => {
  // Here, "id" is assumed to be the movie title.
  const { id } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const release_date = queryParams.get("release_date"); // e.g., "2010-07-16"

  const [movie, setMovie] = useState(null);
  const [posterURL, setPosterURL] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [message, setMessage] = useState(null);

  // Fetch movie details using the API search endpoint.
  useEffect(() => {
    const fetchMovie = async () => {
      try {
        let searchUrl = `http://localhost:8000/api_search/?title=${encodeURIComponent(id)}`;
        if (release_date) {
          searchUrl += `&release_date=${encodeURIComponent(release_date)}`;
        }
        const response = await fetch(searchUrl);
        const data = await response.json();

        if (response.ok && data.Title) {
          setMovie({
            title: data.Title,
            year: data.Year,
            runtime: data.Runtime,
            rating: data.Rated,
            plot: data.Plot,
            director: data.Director,
            id: id, // preserve the movie title as the ID
          });
        } else {
          throw new Error(data.error || "Movie not found via OMDB search.");
        }
      } catch (err) {
        console.error("Error in OMDB search:", err);
        setError("No movie found via OMDB search.");
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [id, release_date]);

  // Fetch the poster image.
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

  // Add movie to watchlist
  const addToWatchlist = async (movie) => {
    // Validate that the movie object has a title
    const titleParam = movie.title || movie.original_title;
    console.log(">>>>>>>>>" + titleParam)
    if (!titleParam) {
      setMessage({ text: "Invalid movie title.", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
  
    // Extract the release year if available
    const releaseDate = movie.release_date || "";
    const releaseYear = releaseDate ? releaseDate.split("-")[0] : "";
  
    setLoadingAdd(true);
    try {
      // Call the search endpoint using the movie title and release year
      const searchUrl = `http://localhost:8000/search/?q=${encodeURIComponent(
        titleParam
      )}${releaseYear ? `&year=${encodeURIComponent(releaseYear)}` : ""}`;
      const searchResponse = await fetch(searchUrl, {
        method: "GET",
        credentials: "include",
      });
      const searchData = await searchResponse.json();
      
      console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>" + searchData.movies[0].id)

      if (searchResponse.ok && searchData.movies && searchData.movies.length > 0) {
        // Use the first matching movie's ID from the search results
        const foundMovieId = searchData.movies[0].id;
        // Now, call the add_movie endpoint using the found movie ID
        const addResponse = await fetch(
          `http://localhost:8000/add_movie/?movie_id=${foundMovieId}`,
          {
            method: "GET",
            credentials: "include",
          }
        );
        const addData = await addResponse.json();
        if (addResponse.ok) {
          setMessage({ text: addData.message || "Movie added to watchlist!", type: "success" });
        } else {
          setMessage({ text: addData.error || "An error occurred.", type: "error" });
        }
      } else {
        setMessage({ text: "Movie not found in search.", type: "error" });
      }
    } catch (err) {
      console.error("Failed to add movie to watchlist:", err);
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
            src={posterURL || "https://via.placeholder.com/300x450?text=No+Image"}
            alt={movie.title}
            style={styles.poster}
          />
          <button
            style={styles.addButton}
            onClick={() => addToWatchlist(movie)}
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

export default MovieDetailsPage;

// Inline styles
const styles = {
  container: { padding: "20px", color: "#fff", backgroundColor: "#240046" },
  message: {
    padding: "10px",
    marginBottom: "20px",
    color: "#fff",
    borderRadius: "4px",
    textAlign: "center",
  },
  title: { textAlign: "center", margin: "0 0 20px 350px" },
  detailsWrapper: { display: "flex", alignItems: "flex-start", gap: "20px", marginTop: "20px" },
  posterContainer: { position: "relative", width: "300px", height: "444px", margin: "0 0 20px 50px", flexShrink: 0 },
  poster: { width: "100%", height: "100%", borderRadius: "6px", objectFit: "cover" },
  addButton: {
    position: "absolute",
    top: "10px",
    right: "10px",
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
  info: { flex: 1 },
};
