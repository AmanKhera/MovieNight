import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PopularCarousel = ({ title = "Popular Movies" }) => {
  const [movies, setMovies] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const itemsToScroll = 1;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState({});

  const [selectedMovie, setSelectedMovie] = useState(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ rating: "", review: "" });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchPopularMovies = async () => {
      try {
        const response = await fetch("http://localhost:8000/popular_movie/");
        if (!response.ok) throw new Error(`Failed to fetch popular movies: ${response.status}`);
        const data = await response.json();
        setMovies(data.results || []);
        setCurrentIndex(data.results.length);
      } catch (error) {
        console.error("Error fetching popular movies:", error);
      }
    };

    const updateItemsPerPage = () => {
      const width = window.innerWidth;
      if (width >= 1400) setItemsPerPage(10);
      else if (width >= 1200) setItemsPerPage(8);
      else if (width >= 992) setItemsPerPage(6);
      else if (width >= 768) setItemsPerPage(4);
      else setItemsPerPage(2);
    };

    fetchPopularMovies();
    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, []);

  const extendedItems = [
    ...movies.slice(-itemsPerPage),
    ...movies,
    ...movies.slice(0, itemsPerPage),
  ];

  const nextSlide = () => {
    setEnableTransition(true);
    setCurrentIndex((prev) => prev + itemsToScroll);
  };

  const prevSlide = () => {
    setEnableTransition(true);
    setCurrentIndex((prev) => prev - itemsToScroll);
  };

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
    const movieWidth = 100 / itemsPerPage;
    const translateValue = currentIndex * movieWidth;
    return `translateX(-${translateValue}%)`;
  };

  const addToWatchlist = async (movie) => {
    const titleParam = movie.title || movie.original_title;
    if (!titleParam) {
      setMessage({ text: "Invalid movie title.", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const releaseYear = movie.release_date ? movie.release_date.split("-")[0] : "";
    setLoading((prev) => ({ ...prev, [movie.id]: true }));

    try {
      const searchUrl = `http://localhost:8000/search/?q=${titleParam}&year=${releaseYear}`;
      const searchResponse = await fetch(searchUrl, { method: "GET", credentials: "include" });
      const searchData = await searchResponse.json();
      if (!searchResponse.ok || searchData.error || !searchData.movies?.length) throw new Error(searchData.error || "Movie not found in search.");

      const foundMovieId = searchData.movies[0].id;
      const addResponse = await fetch(`http://localhost:8000/add_movie/?movie_id=${foundMovieId}`, {
        method: "GET",
        credentials: "include",
      });
      const addData = await addResponse.json();
      if (!addResponse.ok) throw new Error(addData.error || "An error occurred.");

      setMessage({ text: addData.message || "Movie added to watchlist!", type: "success" });
    } catch (err) {
      console.error("Failed to add movie to watchlist:", err);
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading((prev) => ({ ...prev, [movie.id]: false }));
      setDropdownVisible(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const submitAddToWatched = async (e) => {
    e.preventDefault();
    if (!selectedMovie) return;
    setLoading((prev) => ({ ...prev, [selectedMovie.id]: true }));

    try {
      const userInfoResponse = await fetch("http://localhost:8000/user_info/", {
        method: "GET",
        credentials: "include",
      });
      const userInfo = await userInfoResponse.json();
      if (!userInfoResponse.ok) throw new Error(userInfo.error || "Failed to get user info.");

      const titleParam = selectedMovie.title || selectedMovie.original_title;
      const releaseYear = selectedMovie.release_date ? selectedMovie.release_date.split("-")[0] : "";
      const searchUrl = `http://localhost:8000/search/?q=${titleParam}&year=${releaseYear}`;
      const searchResponse = await fetch(searchUrl, { method: "GET", credentials: "include" });
      const searchData = await searchResponse.json();
      if (!searchResponse.ok || searchData.error || !searchData.movies?.length)
        throw new Error(searchData.error || "Movie not found in search.");

      const foundMovieId = searchData.movies[0].id;
      const payload = {
        user_id: userInfo.id,
        movie_id: foundMovieId,
        rating: formData.rating ? parseInt(formData.rating) : null,
        review: formData.review,
      };

      const response = await fetch("http://localhost:8000/add_to_watched/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "An error occurred.");

      setMessage({ text: data.message || "Movie added to watched list!", type: "success" });
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

  const handleMovieClick = (movie) => {
    const titleParam = encodeURIComponent(movie.title || movie.original_title);
    const releaseDate = movie.release_date;
    navigate(releaseDate ? `/movie/${titleParam}?release_date=${encodeURIComponent(releaseDate)}` : `/movie/${titleParam}`);
  };

  const handleDropdownAddToWatchlist = () => addToWatchlist(selectedMovie);
  const handleDropdownAddToWatched = () => {
    setShowModal(true);
    setDropdownVisible(false);
  };

  const handlePlusClick = (movie) => {
    if (selectedMovie?.id === movie.id && dropdownVisible) {
      setDropdownVisible(false);
      setSelectedMovie(null);
    } else {
      setSelectedMovie(movie);
      setDropdownVisible(true);
    }
  };

  if (movies.length === 0) return <div>Loading popular movies...</div>;

  return (
    <div className="popular-carousel">
      <style>{`
        .dropdown-menu {
          position: absolute;
          top: 40px;
          right: 10px;
          background: white;
          border: 1px solid #ccc;
          border-radius: 4px;
          z-index: 5;
          display: flex;
          flex-direction: column;
        }
        .dropdown-menu button {
          background: none;
          border: none;
          padding: 8px 12px;
          text-align: left;
          cursor: pointer;
          font-size: 0.9rem;
          width: 100%;
        }
        .dropdown-menu button:hover {
          background-color: #f0f0f0;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 20;
        }
        .modal {
          background: white;
          padding: 20px;
          border-radius: 8px;
          width: 90%;
          max-width: 400px;
        }
        .modal h3 {
          margin-top: 0;
        }
        .modal form label {
          display: block;
          margin-bottom: 10px;
        }
        .modal form input[type="number"],
        .modal form textarea {
          width: 100%;
          padding: 8px;
          margin-top: 4px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        .modal-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .modal-buttons button {
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .popular-carousel {
          position: relative;
        }
        .carousel-wrapper {
          position: relative;
          overflow: hidden;
        }
        .carousel-container {
          display: flex;
          width: 100%;
        }
        .carousel-item {
          flex-shrink: 0;
          position: relative;
        }
        .image-container {
          position: relative;
          width: 100%;
          padding-top: 150%;
          overflow: hidden;
          background: #000;
        }
        .image-container img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .add-button {
          position: absolute;
          top: 5px;
          right: 5px;
          background: #fff;
          border: 1px solid #ccc;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          cursor: pointer;
        }
        .arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.7);
          border: none;
          padding: 10px;
          cursor: pointer;
          font-size: 18px;
          z-index: 10;
        }
        .left-arrow { left: 0; }
        .right-arrow { right: 0; }
        .message {
          margin-bottom: 10px;
          padding: 8px;
          border-radius: 4px;
        }
        .message.success { background-color: #e0ffe0; color: #2e7d32; }
        .message.error { background-color: #ffe0e0; color: #c62828; }
      `}</style>

      <h2>{title}</h2>
      {message && <div className={`message ${message.type}`}>{message.text}</div>}

      <div className="carousel-wrapper">
        <button className="arrow left-arrow" onClick={prevSlide} aria-label="Previous">&#8249;</button>
        <div
          className="carousel-container"
          style={{ transform: getTransformStyle(), transition: enableTransition ? "transform 0.5s ease-in-out" : "none" }}
          onTransitionEnd={handleTransitionEnd}
        >
          {extendedItems.map((movie, index) => (
            <div className="carousel-item" key={`${movie.id}-${index}`} style={{ flex: `0 0 ${100 / itemsPerPage}%` }}>
              <div className="image-container">
                <img
                  onClick={() => handleMovieClick(movie)}
                  src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : "https://via.placeholder.com/200x300?text=No+Image"}
                  alt={movie.title || movie.original_title}
                />
                <button
                  className="add-button"
                  onClick={() => handlePlusClick(movie)}
                  title="Add Options"
                  aria-label={`Add options for ${movie.title || movie.original_title}`}
                  disabled={loading[movie.id]}
                >
                  {loading[movie.id] ? "..." : "+"}
                </button>
                {dropdownVisible && selectedMovie?.id === movie.id && (
                  <div className="dropdown-menu">
                    <button onClick={handleDropdownAddToWatchlist}>Add to Watchlist</button>
                    <button onClick={handleDropdownAddToWatched}>Add to Watched</button>
                  </div>
                )}
              </div>
              <div className="carousel-info">
                <h3>{movie.title || movie.original_title}</h3>
              </div>
            </div>
          ))}
        </div>
        <button className="arrow right-arrow" onClick={nextSlide} aria-label="Next">&#8250;</button>
      </div>

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
                  onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                />
              </label>
              <label>
                Review:
                <textarea
                  value={formData.review}
                  onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                ></textarea>
              </label>
              <div className="modal-buttons">
                <button type="submit">Add to Watched</button>
                <button type="button" onClick={() => { setShowModal(false); setSelectedMovie(null); }}>
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
