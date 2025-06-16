import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
/**
 * 
 * Discover component non gradient version. See DiscoverCarousel.jsx for more indepth comments
 */
const DiscoverCarousel_nonGradient = ({ 
  id, 
  title = `${id.charAt(0).toUpperCase()}${id.slice(1)} Movies` 
}) => {
  const [movies, setMovies] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const itemsToScroll = 3;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState({});

  const navigate = useNavigate();
  const totalItems = movies.length;

  useEffect(() => {
    const fetchDiscoverMovies = async () => {
      try {
        const response = await fetch(`http://localhost:8000/discover_movie/?genre=${id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch discover movies: ${response.status}`);
        }
        const data = await response.json();
        setMovies(data.results || []);
        setCurrentIndex(data.results.length);
      } catch (error) {
        console.error("Error fetching discover movies:", error);
      }
    };

    fetchDiscoverMovies();

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
  }, [id]);

  const extendedItems = [
    ...movies.slice(-itemsPerPage),
    ...movies,
    ...movies.slice(0, itemsPerPage),
  ];

  const nextSlide = () => {
    setEnableTransition(true);
    setCurrentIndex((prevIndex) => prevIndex + itemsToScroll);
  };

  const prevSlide = () => {
    setEnableTransition(true);
    setCurrentIndex((prevIndex) => prevIndex - itemsToScroll);
  };

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
    const movieWidth = 100 / itemsPerPage;
    const translateValue = currentIndex * movieWidth;
    return `translateX(-${translateValue}%)`;
  };

  const addToWatchlist = async (movieId) => {
    if (!movieId) {
      setMessage({ text: "Invalid movie ID.", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setLoading((prev) => ({ ...prev, [movieId]: true }));
    try {
      const params = new URLSearchParams({ movie_id: movieId });
      const response = await fetch(`http://localhost:8000/add_movie/?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ text: data.message || "Movie added to watchlist.", type: "success" });
      } else {
        setMessage({ text: data.error || "An error occurred.", type: "error" });
      }
    } catch (error) {
      console.error("Error adding movie to watchlist:", error);
      setMessage({ text: "Failed to add movie to watchlist.", type: "error" });
    } finally {
      setLoading((prev) => ({ ...prev, [movieId]: false }));
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleMovieClick = (movie) => {
    const titleParam = encodeURIComponent(movie.title || movie.original_title);
    const releaseDate = movie.release_date;
    if (releaseDate) {
      navigate(`/movie/${titleParam}?release_date=${encodeURIComponent(releaseDate)}`);
    } else {
      navigate(`/movie/${titleParam}`);
    }
  };

  const styles = `
    .popular-carousel {
      width: 100vw;
      margin: 0 auto;
      overflow: hidden;
      position: relative;
      background-color:#240046;
    }
    .popular-carousel h2 {
      font-size: 1.8rem;
      color: white;
      text-align: left;
      margin-left: 1%;
      margin-bottom: 10px;
    }
    .carousel-wrapper {
      display: flex;
      align-items: center;
      position: relative;
      width: 100%;
      overflow: hidden;
    }
    .carousel-container {
      display: flex;
      transition: transform 0.5s ease-in-out;
      width: 100%;
    }
    .carousel-item {
      flex: 0 0 10%;
      text-align: center;
      padding: 0 5px;
      box-sizing: border-box;
      position: relative;
    }
    .carousel-image {
      width: 100%;
      border-radius: 8px;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    .carousel-image:hover {
      transform: scale(1.05);
    }
    .carousel-info h3 {
      font-size: 1rem;
      color: white;
      margin: 5px 0 0;
    }
    .arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.5);
      color: white;
      border: none;
      border-radius: 50%;
      padding: 10px;
      cursor: pointer;
      z-index: 10;
      transition: background-color 0.3s, transform 0.3s;
    }
    .arrow:hover {
      background: rgba(0, 0, 0, 0.8);
      transform: translateY(-50%) scale(1.1);
    }
    .left-arrow {
      left: 10px;
    }
    .right-arrow {
      right: 10px;
    }
    .image-container {
      position: relative;
      width: 100%;
      padding-top: 150%;
      overflow: hidden;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      background-color: #000;
    }
    .carousel-image {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      object-fit: cover;
    }
    .add-button {
      position: absolute;
      top: 10px;
      right: 10px;
      background-color: rgba(255, 255, 255, 0.8);
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      font-size: 20px;
      font-weight: bold;
      color: #333;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.3s, transform 0.3s;
      z-index: 2;
    }
    .add-button:hover {
      background-color: rgba(255, 255, 255, 1);
      transform: scale(1.1);
    }
    .message {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #4caf50;
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 15;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      animation: fadeInOut 3s forwards;
    }
    @keyframes fadeInOut {
      0% {
        opacity: 0;
        transform: translateX(-50%) translateY(-20px);
      }
      10%,
      90% {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      100% {
        opacity: 0;
        transform: translateX(-50%) translateY(-20px);
      }
    }
    @media (max-width: 1400px) {
      .carousel-item {
        flex: 0 0 12.5%;
      }
    }
    @media (max-width: 1200px) {
      .carousel-item {
        flex: 0 0 16.66%;
      }
    }
    @media (max-width: 992px) {
      .carousel-item {
        flex: 0 0 25%;
      }
    }
    @media (max-width: 768px) {
      .carousel-item {
        flex: 0 0 50%;
      }
      .add-button {
        width: 25px;
        height: 25px;
        font-size: 18px;
        top: 8px;
        right: 8px;
      }
      .arrow {
        padding: 8px;
        font-size: 24px;
      }
      .message {
        font-size: 0.9em;
        padding: 8px 16px;
      }
    }
  `;

  if (movies.length === 0) {
    return (
      <div className="popular-carousel">
        <style>{styles}</style>
        <div>Loading movies...</div>
      </div>
    );
  }

  return (
    <div className="popular-carousel">
      <style>{styles}</style>
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
          {extendedItems.map((movie, index) => (
            <div
              className="carousel-item"
              key={`${movie.id}-${index}`}
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
                {/*}<button
                  className="add-button"
                  onClick={() => addToWatchlist(movie.id)}
                  title="Add to Watchlist"
                  aria-label={`Add ${movie.title || movie.original_title} to Watchlist`}
                  disabled={loading[movie.id]}
                >
                  {loading[movie.id] ? "..." : "+"}
                </button>{*/}
              </div>
              <div className="carousel-info">
                {/*}<h3>{movie.title || movie.original_title}</h3>{*/}
              </div>
            </div>
          ))}
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

export default DiscoverCarousel_nonGradient;