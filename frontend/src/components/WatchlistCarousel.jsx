import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./PopularCarousel.css";

const WatchlistCarousel = ({ title = "Your Watchlist" }) => {
  const [movies, setMovies] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const itemsToScroll = 1; // Scroll one item per click
  const [currentIndex, setCurrentIndex] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const [message, setMessage] = useState(null); // For user feedback
  const [loading, setLoading] = useState({}); // Track loading state per movie

  const navigate = useNavigate();

  useEffect(() => {
    const fetchWatchlistMovies = async () => {
      try {
        // Fetch the watchlist items (with cookies)
        const response = await fetch("http://localhost:8000/watchlist_items/", {
          credentials: "include",
        });
        const data = await response.json();
        if (response.ok && data.status === "success") {
          // For each watchlist item, fetch the movie details using the movie_id
          const moviePromises = data.watchlist.map((item) =>
            fetch(`http://localhost:8000/search/?id=${item.movie_id}`, {
              credentials: "include",
            })
              .then((res) => res.json())
              .then((movieData) => {
                if (movieData.movies && movieData.movies.length > 0) {
                  return movieData.movies[0];
                }
                return null;
              })
          );
          const detailedMovies = await Promise.all(moviePromises);
          const validMovies = detailedMovies.filter((movie) => movie !== null);

          // For movies without a valid poster_path, fetch poster from /movie_poster/
          const updatedMovies = await Promise.all(
            validMovies.map(async (movie) => {
              if (!movie.poster_path || movie.poster_path === "N/A") {
                try {
                  const posterResponse = await fetch(
                    "http://localhost:8000/movie_poster/?title=" +
                      encodeURIComponent(movie.title || movie.original_title),
                    { credentials: "include" }
                  );
                  const posterData = await posterResponse.json();
                  if (posterData.poster) {
                    return { ...movie, poster_path: posterData.poster };
                  }
                } catch (err) {
                  console.error("Error fetching poster for", movie.title, err);
                }
              }
              return movie;
            })
          );

          setMovies(updatedMovies);
          // Set the initial index for infinite scrolling (if there are enough movies)
          setCurrentIndex(updatedMovies.length > itemsPerPage ? updatedMovies.length : 0);
        } else {
          setMessage({
            text: data.message || "Failed to fetch watchlist items.",
            type: "error",
          });
        }
      } catch (err) {
        console.error("Error fetching watchlist items:", err);
        setMessage({ text: "Error fetching watchlist items.", type: "error" });
      }
    };

    fetchWatchlistMovies();

    // Update items per page based on viewport width
    const updateItemsPerPage = () => {
      const width = window.innerWidth;
      let newItemsPerPage;
      if (width >= 1400) newItemsPerPage = 10;
      else if (width >= 1200) newItemsPerPage = 8;
      else if (width >= 992) newItemsPerPage = 6;
      else if (width >= 768) newItemsPerPage = 4;
      else newItemsPerPage = 2;
      setItemsPerPage(newItemsPerPage);
    };

    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => {
      window.removeEventListener("resize", updateItemsPerPage);
    };
  }, [itemsPerPage]);

  // Use clones for infinite scrolling only if there are more movies than items per page.
  const useClones = movies.length > itemsPerPage;
  const extendedItems = useClones
    ? [
        ...movies.slice(-itemsPerPage),
        ...movies,
        ...movies.slice(0, itemsPerPage),
      ]
    : movies;

  // Carousel navigation
  const nextSlide = () => {
    if (!useClones) return;
    setEnableTransition(true);
    setCurrentIndex((prevIndex) => prevIndex + itemsToScroll);
  };

  const prevSlide = () => {
    if (!useClones) return;
    setEnableTransition(true);
    setCurrentIndex((prevIndex) => prevIndex - itemsToScroll);
  };

  // Reset position after transition for infinite scrolling
  const handleTransitionEnd = () => {
    if (!useClones) return;
    if (currentIndex >= movies.length + itemsPerPage) {
      setEnableTransition(false);
      setCurrentIndex(currentIndex - movies.length);
    } else if (currentIndex < itemsPerPage) {
      setEnableTransition(false);
      setCurrentIndex(currentIndex + movies.length);
    }
  };

  const getTransformStyle = () => {
    const movieWidth = 100 / itemsPerPage; // Each movie's width as a percentage
    const translateValue = currentIndex * movieWidth;
    return `translateX(-${translateValue}%)`;
  };

  // Function to add a movie to the watchlist (if needed)
  const addToWatchlist = async (movie) => {
    const titleParam = movie.title || movie.original_title;
    if (!titleParam) {
      setMessage({ text: "Invalid movie title.", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    const releaseDate = movie.release_date || "";
    const releaseYear = releaseDate ? releaseDate.split("-")[0] : "";

    setLoading((prev) => ({ ...prev, [movie.id]: true }));
    try {
      const params = ["q=" + titleParam];
      if (releaseYear) {
        params.push("year=" + releaseYear);
      }
      const searchUrl = "http://localhost:8000/search/?" + params.join("&");
      const searchResponse = await fetch(searchUrl, {
        method: "GET",
        credentials: "include",
      });
      if (!searchResponse.ok) {
        throw new Error("Failed to search");
      }
      const searchData = await searchResponse.json();
      if (searchData.error) {
        throw new Error(searchData.error);
      }
      if (!searchData.movies || searchData.movies.length === 0) {
        throw new Error("Movie not found in search.");
      }
      const foundMovieId = searchData.movies[0].id;
      const addResponse = await fetch(
        "http://localhost:8000/add_movie/?movie_id=" + foundMovieId,
        {
          method: "GET",
          credentials: "include",
        }
      );
      if (!addResponse.ok) {
        const addData = await addResponse.json();
        throw new Error(addData.error || "An error occurred.");
      }
      const addData = await addResponse.json();
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

  // Navigate to movie details when poster is clicked
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

  if (movies.length === 0) {
    return <div>Loading watchlist movies...</div>;
  }

  return (
    <div className="popular-carousel">
      <h2>{title}</h2>
      {message && <div className={`message ${message.type}`}>{message.text}</div>}
      <div className="carousel-wrapper">
        {useClones && (
          <button className="arrow left-arrow" onClick={prevSlide} aria-label="Previous">
            &#8249;
          </button>
        )}
        <div
          className="carousel-container"
          style={{
            transform: getTransformStyle(),
            transition: enableTransition ? "transform 0.5s ease-in-out" : "none",
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {extendedItems.map((movie, index) => {
            const movieId = movie.id;
            return (
              <div
                className="carousel-item"
                key={`${movieId}-${index}`}
                style={{ flex: `0 0 ${100 / itemsPerPage}%` }}
              >
                <div className="image-container" style={{ backgroundColor: "transparent" }}>
                  <img
                    onClick={() => handleMovieClick(movie)}
                    src={
                      movie.poster_path
                        ? movie.poster_path.startsWith("http")
                          ? movie.poster_path
                          : `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                        : "https://via.placeholder.com/200x300?text=No+Image"
                    }
                    alt={movie.title || movie.original_title}
                    className="carousel-image"
                    style={{ cursor: "pointer", transformOrigin: "center", zIndex: 1 }}
                  />
                  <button
                    className="add-button"
                    onClick={() => addToWatchlist(movie)}
                    title="Add to Watchlist"
                    aria-label={`Add ${movie.title || movie.original_title} to Watchlist`}
                    disabled={loading[movieId]}
                  >
                    {loading[movieId] ? "..." : "+"}
                  </button>
                </div>
                <div className="carousel-info">
                  <h3>{movie.title || movie.original_title}</h3>
                </div>
              </div>
            );
          })}
        </div>
        {useClones && (
          <button className="arrow right-arrow" onClick={nextSlide} aria-label="Next">
            &#8250;
          </button>
        )}
      </div>
    </div>
  );
};

export default WatchlistCarousel;
