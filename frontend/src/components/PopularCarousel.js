import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // <-- Import from react-router-dom
import "./PopularCarousel.css";

const PopularCarousel = ({ title = "Popular Movies" }) => {
  const [movies, setMovies] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const itemsToScroll = 1; // Scroll one item per click
  const [currentIndex, setCurrentIndex] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const [message, setMessage] = useState(null); // For user feedback
  const [loading, setLoading] = useState({}); // Track loading state per movie

  const navigate = useNavigate(); // <-- We'll use this to redirect the user

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

  // Function to add a movie to the watchlist
  const addToWatchlist = async (movieId) => {
    if (!movieId) {
      setMessage({ text: "Invalid movie ID.", type: "error" });
      setTimeout(() => {
        setMessage(null);
      }, 3000);
      return;
    }

    console.log(`Attempting to add movie with ID: ${movieId} to watchlist`);

    // Set loading state for this movie
    setLoading((prev) => ({ ...prev, [movieId]: true }));

    try {
      // Construct the query parameters
      const params = new URLSearchParams({ movie_id: movieId });

      // Optional: Include watchlist_name if you want to specify a different watchlist
      // params.append('watchlist_name', 'MyCustomWatchlist');

      const response = await fetch(
        `http://localhost:8000/add_movie/?${params.toString()}`,
        {
          method: "GET",
          credentials: "include", // Include cookies for session authentication
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
      // Clear the loading state and message after 3 seconds
      setLoading((prev) => ({ ...prev, [movieId]: false }));
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    }
  };

  // Handle clicking on the movie poster to go to the details page
  const handleMovieClick = (movieId) => {
    navigate(`/movie/${movieId}`); // e.g. /movie/123
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
            // Debugging log to inspect movie object
            console.log(
              `Rendering movie: ${movie.title || movie.original_title}, ID: ${movie.id}`
            );

            // Check if movie.id exists
            const movieId = movie.id;
            if (!movieId) {
              console.warn(
                `Movie at index ${index} is missing 'id' property.`,
                movie
              );
            }

            return (
              <div
                className="carousel-item"
                key={`${movieId}-${index}`} // better key for uniqueness
                style={{ flex: `0 0 ${100 / itemsPerPage}%` }}
              >
                <div className="image-container">
                  {/* When the poster is clicked, go to the movie details page */}
                  <img
                    onClick={() => handleMovieClick(movieId)}
                    src={
                      movie.poster_path
                        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                        : "https://via.placeholder.com/200x300?text=No+Image"
                    }
                    alt={movie.title || movie.original_title}
                    className="carousel-image"
                    style={{ cursor: "pointer" }} // indicate that it's clickable
                  />
                  <button
                    className="add-button"
                    onClick={() => addToWatchlist(movieId)}
                    title="Add to Watchlist"
                    aria-label={`Add ${movie.title || movie.original_title} to Watchlist`}
                    disabled={loading[movieId]} // Disable button while loading
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
