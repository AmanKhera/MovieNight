import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PopularCarousel = ({ title = "" }) => {
  const [movies, setMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [message, setMessage] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [fadeTransition, setFadeTransition] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchPopularMovies = async () => {
      try {
        const response = await fetch("http://localhost:8000/popular_movie/");
        if (!response.ok) throw new Error("Failed to fetch movies");
        const data = await response.json();

        // ✅ Filter only movies with backdrops
        const filteredMovies = (data.results || []).filter(
          (movie) => movie.backdrop_path
        );
        setMovies(filteredMovies);
      } catch (error) {
        console.error("Error fetching movies:", error);
      }
    };
    fetchPopularMovies();
  }, []);

  const goToPrevious = () => {
    setFadeTransition(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === 0 ? movies.length - 1 : prevIndex - 1
      );
      setFadeTransition(false);
    }, 300); // match transition duration
  };

  const goToNext = () => {
    setFadeTransition(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === movies.length - 1 ? 0 : prevIndex + 1
      );
      setFadeTransition(false);
    }, 300); // match transition duration
  };

  const goToSlide = (index) => {
    setFadeTransition(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setFadeTransition(false);
    }, 300);
  };

  const handleMovieClick = (movie) => {
    const titleParam = encodeURIComponent(
      movie.title || movie.original_title
    );
    const releaseDate = movie.release_date;
    navigate(
      releaseDate
        ? `/movie/${titleParam}?release_date=${encodeURIComponent(
            releaseDate
          )}`
        : `/movie/${titleParam}`
    );
  };

  if (!movies.length) return <div>Loading popular movies...</div>;

  const currentMovie = movies[currentIndex];

  return (
    <div className="popular-carousel">
      <style>{`
        .popular-carousel {
          position: relative;
          width: 100%;
          overflow: hidden;
          margin: 0; /* Remove margins to fill full width */
          height: 96vh; /* Full viewport height */
        }
        
        .carousel-title {
          position: absolute;
          top: 80px; /* Position below the toolbar */
          left: 20px;
          color: white;
          text-transform: uppercase;
          font-weight: 450;
          font-size: 0.9rem;
          z-index: 10;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
        }
        
        .carousel-slide {
          position: relative;
          width: 100%;
          height: 100vh; /* Full viewport height */
          cursor: pointer;
          overflow: hidden;
        }
        
        .carousel-slide img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          display: block;
          opacity: 0;
          transition: opacity 0.8s ease, transform 0.3s ease;
        }
        
        .carousel-slide img.loaded {
          opacity: 1;
        }
        
        .carousel-slide img.fade-out {
          opacity: 0;
        }
        
        .carousel-slide img:hover {
          transform: scale(1.03);
        }
        
        .carousel-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          padding: 40px 20px;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
          color: white;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
          z-index: 1;
        }
        
        .carousel-overlay h2 {
          margin: 5;
          font-size: 4rem !important;
          font-weight: bold;
        }
        
        .carousel-button {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background-color: rgba(0, 0, 0, 0.6);
          color: white;
          border: none;
          padding: 12px;
          cursor: pointer;
          font-size: 22px;
          z-index: 2;
          border-radius: 50%;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.3s;
        }
        
        .carousel-button:hover {
          background-color: rgb(69, 0, 134);
        }
        
        .prev-button { left: 15px; }
        .next-button { right: 20px; }
        
        .carousel-dots {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          text-align: center;
          z-index: 10;
        }
        
        .dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          margin: 0 4px;
          background-color: rgba(238, 200, 255, 0.4);
          border-radius: 50%;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .dot.active {
          background-color: white;
        }
        
        /* Mobile responsiveness */
        @media (max-width: 1024px) {
          .carousel-slide {
            height: 80vh;
          }
          .popular-carousel {
            height: 80vh;
          }
          .carousel-overlay h2 {
            font-size: 2.5rem !important;
          }
        }
        
        @media (max-width: 768px) {
          .carousel-slide {
            height: 60vh;
          }
          .popular-carousel {
            height: 60vh;
          }
          .carousel-overlay h2 {
            font-size: 1.8rem !important;
          }
          .carousel-title {
            top: 60px;
            left: 15px;
            font-size: 0.8rem;
          }
          .carousel-overlay {
            padding: 20px 15px;
          }
        }
      `}</style>

      <div className="carousel-title">{title}</div>

      <div
        className="carousel-slide"
        onClick={() => handleMovieClick(currentMovie)}
      >
        <img
          src={`https://image.tmdb.org/t/p/original${currentMovie.backdrop_path}`}
          alt={currentMovie.title || currentMovie.original_title}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          className={`${imageLoaded ? "loaded" : ""} ${
            fadeTransition ? "fade-out" : ""
          }`}
        />

        {/* ✅ Title Overlay */}
        <div className="carousel-overlay">
          <h2>{currentMovie.title || currentMovie.original_title}</h2>
        </div>

        <button
          className="carousel-button prev-button"
          onClick={(e) => {
            e.stopPropagation();
            goToPrevious();
          }}
        >
          &#10094;
        </button>
        <button
          className="carousel-button next-button"
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
        >
          &#10095;
        </button>
      </div>

      <div className="carousel-dots">
        {movies.map((_, index) => (
          <span
            key={index}
            className={`dot ${currentIndex === index ? "active" : ""}`}
            onClick={() => goToSlide(index)}
          ></span>
        ))}
      </div>

      {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}
    </div>
  );
};

export default PopularCarousel;