import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";

const MovieDetailsPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const release_date = queryParams.get("release_date");

  const [movie, setMovie] = useState(null);
  const [posterURL, setPosterURL] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [message, setMessage] = useState(null);
  const [enhancedPlot, setEnhancedPlot] = useState(null);
  const [loadingPlot, setLoadingPlot] = useState(false);

  // Fetch movie details
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
      }
    });
  }, [id, release_date]);

  // Fetch the poster image
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

  // Enhance the plot using AI
  const enhancePlot = async (movieData) => {
    setLoadingPlot(true);
    try {
      const response = await fetch('http://localhost:8000/generate-movie-summary/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      setEnhancedPlot(movieData.plot); // Fallback to original plot
    } finally {
      setLoadingPlot(false);
    }
  };

  // Add movie to watchlist
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
      const searchUrl = `http://localhost:8000/search/?q=${encodeURIComponent(
        titleParam
      )}${releaseYear ? `&year=${encodeURIComponent(releaseYear)}` : ""}`;
      const searchResponse = await fetch(searchUrl, {
        method: "GET",
        credentials: "include",
      });
      const searchData = await searchResponse.json();
      
      if (searchResponse.ok && searchData.movies && searchData.movies.length > 0) {
        const foundMovieId = searchData.movies[0].id;
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

  if (loading) return <div style={styles.loading}>Loading movie details...</div>;
  if (error) return <div style={styles.error}>Error: {error}</div>;
  if (!movie) return <div style={styles.error}>No movie details found.</div>;

  return (
    <div style={styles.container}>
      {message && (
        <div style={{ 
          ...styles.message, 
          backgroundColor: message.type === "success" ? "#4caf50" : "#f44336" 
        }}>
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
          <h2 style={styles.sectionTitle}>Plot</h2>
          {loadingPlot ? (
            <div style={styles.plotLoading}>Generating enhanced description...</div>
          ) : (
            <p style={styles.plotText}>{enhancedPlot || movie.plot}</p>
          )}
          
          <div style={styles.metadata}>
            <p><strong>Release Year:</strong> {movie.year}</p>
            <p><strong>Rating:</strong> {movie.rating}</p>
            <p><strong>Runtime:</strong> {movie.runtime}</p>
            <p><strong>Director:</strong> {movie.director}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { 
    padding: "20px", 
    color: "#fff", 
    backgroundColor: "#240046",
    minHeight: "100vh"
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
    margin: "0 auto 20px",
    color: "#fff",
    borderRadius: "4px",
    textAlign: "center",
    maxWidth: "80%",
    fontSize: "1rem"
  },
  title: { 
    textAlign: "center", 
    margin: "0 0 30px 0",
    fontSize: "2rem",
    color: "#f8f9fa"
  },
  detailsWrapper: { 
    display: "flex", 
    flexDirection: { xs: "column", md: "row" },
    alignItems: "flex-start", 
    gap: "40px", 
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 20px"
  },
  posterContainer: { 
    position: "relative", 
    width: "300px", 
    flexShrink: 0,
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 4px 8px rgba(0,0,0,0.3)"
  },
  poster: { 
    width: "100%", 
    height: "auto",
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
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
    transition: "all 0.2s",
    "&:hover": {
      transform: "scale(1.1)",
      backgroundColor: "#fff"
    }
  },
  info: {
    flex: 1,
    padding: "0 0 20px 0"
  },
  sectionTitle: {
    fontSize: "1.5rem",
    marginBottom: "20px",
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
  },
  metadata: {
    backgroundColor: "rgba(46, 16, 101, 0.5)",
    padding: "20px",
    borderRadius: "8px",
    "& p": {
      margin: "10px 0",
      fontSize: "1rem"
    },
    "& strong": {
      color: "#e0aaff",
      marginRight: "8px"
    }
  }
};

export default MovieDetailsPage;