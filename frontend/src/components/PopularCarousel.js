import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./PopularCarousel.css";

const PopularCarousel = ({ title = "Popular Movies" }) => {
  const [movies, setMovies] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const itemsToScroll = 1; // Scroll one item per click
  const [currentIndex, setCurrentIndex] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const [message, setMessage] = useState(null); // For user feedback
  const [loading, setLoading] = useState({}); // Track loading state per movie

  const navigate = useNavigate();

  const totalItems = movies.length;

  // Fetch popular movies from the backend
  useEffect(() => {
    const fetchPopularMovies = async () => {
      try {
        const response = await fetch("http://localhost:8000/popular_movie/");
        if (!response.ok) {
          throw new Error(`Failed to fetch popular movies: ${response.status}`);
        }
        const data = await response.json();
        console.log(data);
        setMovies(data.results || []);

        // Set the initial index for infinite scrolling
        setCurrentIndex(data.results.length);
      } catch (error) {
        console.error("Error fetching popular movies:", error);
      }
    };

    fetchPopularMovies();

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
  }, []);

  // Clone items for infinite scrolling
  const extendedItems = [
    ...movies.slice(-itemsPerPage),
    ...movies,
    ...movies.slice(0, itemsPerPage),
  ];

  // Handle next slide
  const nextSlide = () => {
    setEnableTransition(true);
    setCurrentIndex((prevIndex) => prevIndex + itemsToScroll);
  };

  // Handle previous slide
  const prevSlide = () => {
    setEnableTransition(true);
    setCurrentIndex((prevIndex) => prevIndex - itemsToScroll);
  };

  // Reset position after transition for infinite scrolling
  const handleTransitionEnd = () => {
    if (currentIndex >= totalItems + itemsPerPage) {
      setEnableTransition(false);
      setCurrentIndex(currentIndex - totalItems);
    } else if (currentIndex < itemsPerPage) {
      setEnableTransition(false);
      setCurrentIndex(currentIndex + totalItems);
    }
  };

  const getTransformStyle = () => {
    const movieWidth = 100 / itemsPerPage; // Each movie's width as a percentage
    const translateValue = currentIndex * movieWidth;
    return `translateX(-${translateValue}%)`;
  };

  // Function to add a movie to the watchlist (using the movie's internal ID)
  const addToWatchlist = async (movieId) => {
    if (!movieId) {
      setMessage({ text: "Invalid movie ID.", type: "error" });
      setTimeout(() => {
        setMessage(null);
      }, 3000);
      return;
    }

    console.log(`Attempting to add movie with ID: ${movieId} to watchlist`);
    setLoading((prev) => ({ ...prev, [movieId]: true }));

    try {
      const params = new URLSearchParams({ movie_id: movieId });
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
          text: data.message || "Movie added to watchlist.",
          type: "success",
        });
      } else {
        setMessage({ text: data.error || "An error occurred.", type: "error" });
      }
    } catch (error) {
      console.error("Error adding movie to watchlist:", error);
      setMessage({ text: "Failed to add movie to watchlist.", type: "error" });
    } finally {
      setLoading((prev) => ({ ...prev, [movieId]: false }));
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    }
  };

  // Handle clicking on the movie poster to go to the details page.
  // We pass the movie title (and release date, if available) in the URL.
  const handleMovieClick = (movie) => {
    // Use the movie title for the details lookup.
    const titleParam = encodeURIComponent(movie.title || movie.original_title);
    const releaseDate = movie.release_date; // TMDb usually provides release_date
    if (releaseDate) {
      navigate(`/movie/${titleParam}?release_date=${encodeURIComponent(releaseDate)}`);
    } else {
      navigate(`/movie/${titleParam}`);
    }
  };

  if (movies.length === 0) {
    return <div>Loading popular movies...</div>;
  }

  return (
    <div className="popular-carousel">
      <h2>{title}</h2>
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      <div className="carousel-wrapper">
        <button
          className="arrow left-arrow"
          onClick={prevSlide}
          aria-label="Previous"
        >
          &#8249;
        </button>
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
                <div className="image-container">
                  {/* Clicking the poster navigates to the details page */}
                  <img
                    onClick={() => handleMovieClick(movie)}
                    src={
                      movie.poster_path
                        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                        : "https://via.placeholder.com/200x300?text=No+Image"
                    }
                    alt={movie.title || movie.original_title}
                    className="carousel-image"
                    style={{ cursor: "pointer" }}
                  />
                  <button
                    className="add-button"
                    onClick={() => addToWatchlist(movieId)}
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
        <button
          className="arrow right-arrow"
          onClick={nextSlide}
          aria-label="Next"
        >
          &#8250;
        </button>
      </div>
    </div>
  );
};

export default PopularCarousel;
