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

  // New states for dropdown and modal
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ rating: "", review: "" });

  const navigate = useNavigate();

  // Fetch popular movies and update itemsPerPage on window resize
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

  // Existing function: add movie to watchlist (using search endpoint)
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
      console.log("Search result:", searchData.movies[0].id);
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
      setDropdownVisible(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // New function: submit Add to Watched form
  // This function:
  // 1. Retrieves the user info from /user_info/ (which returns user id, name, etc.)
  // 2. Uses the search endpoint to retrieve the movie_id.
  // 3. Sends a POST request to /add_to_watched/ with user_id, movie_id, rating, and review.
  const submitAddToWatched = async (e) => {
    e.preventDefault();
    if (!selectedMovie) return;
    setLoading((prev) => ({ ...prev, [selectedMovie.id]: true }));
    try {
      // 1. Retrieve user info from /user_info/
      const userInfoResponse = await fetch("http://localhost:8000/user_info/", {
        method: "GET",
        credentials: "include",
      });
      const userInfo = await userInfoResponse.json();
      if (!userInfoResponse.ok) {
        throw new Error(userInfo.error || "Failed to get user info.");
      }
      // Use the user's id from the response
      const userId = userInfo.id;

      // 2. Retrieve movie_id using search endpoint (like in addToWatchlist)
      const titleParam = selectedMovie.title || selectedMovie.original_title;
      if (!titleParam) {
        setMessage({ text: "Invalid movie title.", type: "error" });
        setTimeout(() => setMessage(null), 3000);
        return;
      }
      const releaseDate = selectedMovie.release_date || "";
      const releaseYear = releaseDate ? releaseDate.split("-")[0] : "";
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
        throw new Error("Failed to search for movie.");
      }
      const searchData = await searchResponse.json();
      if (searchData.error) {
        throw new Error(searchData.error);
      }
      if (!searchData.movies || searchData.movies.length === 0) {
        throw new Error("Movie not found in search.");
      }
      const foundMovieId = searchData.movies[0].id;

      // 3. Build payload and call add_to_watched endpoint
      const payload = {
        user_id: userId,
        movie_id: foundMovieId,
        rating: formData.rating ? parseInt(formData.rating) : null,
        review: formData.review,
      };
      const response = await fetch("http://localhost:8000/add_to_watched/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "An error occurred.");
      }
      setMessage({
        text: data.message || "Movie added to watched list!",
        type: "success",
      });
      setShowModal(false);
      setFormData({ rating: "", review: "" });
    } catch (error) {
      console.error("Failed to add movie to watched:", error);
      setMessage({ text: error.message, type: "error" });
    } finally {
      setLoading((prev) => ({ ...prev, [selectedMovie.id]: false }));
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Handle clicking on the movie poster to navigate to the details page
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

  // Dropdown option handlers
  const handleDropdownAddToWatchlist = () => {
    addToWatchlist(selectedMovie);
  };

  const handleDropdownAddToWatched = () => {
    // Open the modal for adding rating and review
    setShowModal(true);
    setDropdownVisible(false);
  };

  // Toggle dropdown when + is clicked
  const handlePlusClick = (movie) => {
    // Toggle dropdown for the same movie
    if (selectedMovie && selectedMovie.id === movie.id && dropdownVisible) {
      setDropdownVisible(false);
      setSelectedMovie(null);
    } else {
      setSelectedMovie(movie);
      setDropdownVisible(true);
    }
  };

  if (movies.length === 0) {
    return <div>Loading popular movies...</div>;
  }

  return (
    <div className="popular-carousel">
      <h2>{title}</h2>
      {message && <div className={`message ${message.type}`}>{message.text}</div>}
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
                  {/* "+" Button toggles dropdown */}
                  <button
                    className="add-button"
                    onClick={() => handlePlusClick(movie)}
                    title="Add Options"
                    aria-label={`Add options for ${movie.title || movie.original_title}`}
                    disabled={loading[movieId]}
                  >
                    {loading[movieId] ? "..." : "+"}
                  </button>
                  {/* Render dropdown if this movie is selected */}
                  {dropdownVisible &&
                    selectedMovie &&
                    selectedMovie.id === movie.id && (
                      <div className="dropdown-menu">
                        <button onClick={handleDropdownAddToWatchlist}>
                          Add to Watchlist
                        </button>
                        <button onClick={handleDropdownAddToWatched}>
                          Add to Watched
                        </button>
                      </div>
                    )}
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

      {/* Modal for adding movie to watched */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add to Watched</h3>
            <form onSubmit={submitAddToWatched}>
              <label>
                Rating (1-5):
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.rating}
                  onChange={(e) =>
                    setFormData({ ...formData, rating: e.target.value })
                  }
                />
              </label>
              <label>
                Review:
                <textarea
                  value={formData.review}
                  onChange={(e) =>
                    setFormData({ ...formData, review: e.target.value })
                  }
                ></textarea>
              </label>
              <div className="modal-buttons">
                <button type="submit">Add to Watched</button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedMovie(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PopularCarousel;
