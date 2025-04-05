import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";

const MovieDetailsPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const release_date = queryParams.get("release_date");

  const [movie, setMovie] = useState(null);
  const [posterURL, setPosterURL] = useState(null);
  const [backdropURL, setBackdropURL] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [message, setMessage] = useState(null);
  const [enhancedPlot, setEnhancedPlot] = useState(null);
  const [loadingPlot, setLoadingPlot] = useState(false);

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
          const movieData = {
            title: data.Title,
            year: data.Year,
            runtime: data.Runtime,
            rating: data.Rated,
            plot: data.Plot,
            director: data.Director,
            id: id,
          };
          setMovie(movieData);
          return movieData;
        } else {
          throw new Error(data.error || "Movie not found");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMovie().then(movieData => {
      if (movieData) {
        enhancePlot(movieData);
        fetchBackdrop(movieData.title);
      }
    });
  }, [id, release_date]);

  const fetchBackdrop = async (title) => {
    try {
      const response = await fetch(`http://localhost:8000/movie_backdrop/?title=${encodeURIComponent(title)}`);
      const data = await response.json();
      if (data.backdrop) {
        setBackdropURL(data.backdrop);
      }
    } catch (error) {
      console.error("Failed to fetch backdrop:", error);
    }
  };

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

  const enhancePlot = async (movieData) => {
    setLoadingPlot(true);
    try {
      const response = await fetch('http://localhost:8000/generate-movie-summary/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movie_info: {
            title: movieData.title,
            year: movieData.year,
            director: movieData.director,
            plot: movieData.plot
          }
        })
      });

      const data = await response.json();
      if (response.ok) {
        setEnhancedPlot(data.summary);
      } else {
        throw new Error(data.error || "Failed to enhance plot");
      }
    } catch (err) {
      console.error("Plot enhancement failed:", err);
      setEnhancedPlot(movieData.plot);
    } finally {
      setLoadingPlot(false);
    }
  };

  const addToWatchlist = async (movie) => {
    const titleParam = movie.title || movie.original_title;
    if (!titleParam) {
      setMessage({ text: "Invalid movie title.", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const releaseDate = movie.release_date || "";
    const releaseYear = releaseDate ? releaseDate.split("-")[0] : "";

    setLoadingAdd(true);
    try {
      const searchUrl = `http://localhost:8000/search/?q=${encodeURIComponent(titleParam)}${releaseYear ? `&year=${encodeURIComponent(releaseYear)}` : ""}`;
      const searchResponse = await fetch(searchUrl, { method: "GET", credentials: "include" });
      const searchData = await searchResponse.json();

      if (searchResponse.ok && searchData.movies && searchData.movies.length > 0) {
        const foundMovieId = searchData.movies[0].id;
        const addResponse = await fetch(`http://localhost:8000/add_movie/?movie_id=${foundMovieId}`, {
          method: "GET",
          credentials: "include",
        });
        const addData = await addResponse.json();
        setMessage({ text: addData.message || "Movie added to watchlist!", type: "success" });
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

  if (loading) return <div style={styles.loading}>Loading movie details...</div>;
  if (error) return <div style={styles.error}>Error: {error}</div>;
  if (!movie) return <div style={styles.error}>No movie details found.</div>;

  return (
    <div style={{ ...styles.container, backgroundImage: backdropURL ? `url(${backdropURL})` : undefined }}>
      <div style={styles.backdropOverlay} />

      {message && (
        <div style={{
          ...styles.message,
          backgroundColor: message.type === "success" ? "#4caf50" : "#f44336"
        }}>
          {message.text}
        </div>
      )}

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
          <h1 style={styles.title}>{movie.title}</h1>
          <div style={styles.metaBadges}>
            <span style={styles.badge}>📅 {movie.year}</span>
            <span style={styles.badge}>⭐ {movie.rating}</span>
            <span style={styles.badge}>⏱ {movie.runtime}</span>
            <span style={styles.badge}>🎬 {movie.director}</span>
          </div>

          <h2 style={styles.sectionTitle}>Plot</h2>
          {loadingPlot ? (
            <div style={styles.plotLoading}>Generating enhanced description...</div>
          ) : (
            <p style={styles.plotText}>{enhancedPlot || movie.plot}</p>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: "relative",
    padding: "40px 20px",
    color: "#fff",
    backgroundColor: "#240046",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    minHeight: "100vh"
  },
  backdropOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(36, 0, 70, 0.85)",
    zIndex: 0
  },
  loading: {
    color: "#fff",
    textAlign: "center",
    padding: "40px",
    fontSize: "1.2rem"
  },
  error: {
    color: "#ff6b6b",
    textAlign: "center",
    padding: "40px",
    fontSize: "1.2rem"
  },
  message: {
    padding: "15px",
    marginBottom: "20px",
    color: "#fff",
    borderRadius: "4px",
    textAlign: "center",
    maxWidth: "80%",
    margin: "0 auto 20px auto",
    fontSize: "1rem",
    zIndex: 2,
    position: "relative"
  },
  detailsWrapper: {
    display: "flex",
    gap: "40px",
    alignItems: "flex-start",
    maxWidth: "1200px",
    margin: "0 auto",
    position: "relative",
    zIndex: 1
  },
  posterContainer: {
    position: "relative",
    width: "300px",
    flexShrink: 0,
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0,0,0,0.6)"
  },
  poster: {
    width: "100%",
    display: "block"
  },
  addButton: {
    position: "absolute",
    top: "15px",
    right: "15px",
    backgroundColor: "rgba(255,255,255,0.9)",
    border: "none",
    color: "#000",
    cursor: "pointer",
    fontSize: "24px",
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
    transition: "all 0.2s",
  },
  info: {
    flex: 1
  },
  title: {
    margin: "0 0 15px 0",
    fontSize: "2.5rem",
    color: "#fff"
  },
  metaBadges: {
    marginBottom: "20px",
    display: "flex",
    flexWrap: "wrap",
    gap: "10px"
  },
  badge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: "6px 12px",
    borderRadius: "4px",
    fontSize: "0.9rem"
  },
  sectionTitle: {
    fontSize: "1.5rem",
    marginBottom: "15px",
    color: "#e0aaff"
  },
  plotLoading: {
    color: "#adb5bd",
    fontStyle: "italic",
    marginBottom: "25px"
  },
  plotText: {
    lineHeight: "1.6",
    marginBottom: "25px",
    fontSize: "1.1rem"
  }
};

export default MovieDetailsPage;
