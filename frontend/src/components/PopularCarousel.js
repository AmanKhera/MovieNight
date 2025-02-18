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

  // Modified addToWatchlist function:
  // Uses the search endpoint to get the movie's ID by title and release year,
  // then calls the add_movie endpoint with that ID.
  const addToWatchlist = async (movie) => {
    const titleParam = movie.title || movie.original_title;
    if (!titleParam) {
      setMessage({ text: "Invalid movie title.", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    // Extract the release year if available
    const releaseDate = movie.release_date || "";
    const releaseYear = releaseDate ? releaseDate.split("-")[0] : "";

    setLoading((prev) => ({ ...prev, [movie.id]: true }));
    try {
      // Build a simple query string for the search endpoint
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
      console.log("Search result:", searchData.movies[0].id);
      const foundMovieId = searchData.movies[0].id;

      // Now call the add_movie endpoint using the found movie ID
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
      setMessage({ text: addData.message || "Movie added to watchlist!", type: "success" });
    } catch (err) {
      console.error("Failed to add movie to watchlist:", err);
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading((prev) => ({ ...prev, [movie.id]: false }));
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Handle clicking on the movie poster to go to the details page.
  // We pass the movie title (and release date, if available) in the URL.
  const handleMovieClick = (movie) => {
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
                  {/* Pass the whole movie object to addToWatchlist */}
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
