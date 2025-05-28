import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const DirectorMovieCarousel = ({ directorName }) => {
  const [movies, setMovies] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const totalItems = movies.length;

  useEffect(() => {
    if (!directorName) return;

    const fetchMoviesByDirector = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `http://localhost:8000/search/?filter=director&q=${encodeURIComponent(directorName)}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch movies by director: ${response.status}`);
        }
        
        const data = await response.json();
        const moviesWithPosters = await Promise.all(
          data.directors.map(async (movie) => {
            try {
              const posterResponse = await fetch(
                `http://localhost:8000/movie_poster/?title=${encodeURIComponent(movie.title)}`
              );
              const posterData = await posterResponse.json();
              return {
                ...movie,
                poster_url: posterData.poster || "https://via.placeholder.com/200x300?text=No+Image"
              };
            } catch (error) {
              return {
                ...movie,
                poster_url: "https://via.placeholder.com/200x300?text=No+Image"
              };
            }
          })
        );
        
        setMovies(moviesWithPosters);
        setCurrentIndex(moviesWithPosters.length);
      } catch (err) {
        setError("Failed to load director's movies");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMoviesByDirector();

    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1400) setItemsPerPage(10);
      else if (width >= 1200) setItemsPerPage(8);
      else if (width >= 992) setItemsPerPage(6);
      else if (width >= 768) setItemsPerPage(4);
      else setItemsPerPage(2);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [directorName]);

  const extendedItems = [
    ...movies.slice(-itemsPerPage),
    ...movies,
    ...movies.slice(0, itemsPerPage),
  ];

  const nextSlide = () => {
    setEnableTransition(true);
    setCurrentIndex(prev => prev + 3);
  };

  const prevSlide = () => {
    setEnableTransition(true);
    setCurrentIndex(prev => prev - 3);
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

  const handleMovieClick = (movie) => {
    const titleParam = encodeURIComponent(movie.title);
    if (movie.release_date) {
      navigate(`/movie/${titleParam}?release_date=${encodeURIComponent(movie.release_date)}`);
    } else {
      navigate(`/movie/${titleParam}`);
    }
  };

  if (isLoading) {
    return (
      <div className="director-carousel">
        <h2>More by {directorName}</h2>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="director-carousel">
        <h2>More by {directorName}</h2>
        <div className="error">{error}</div>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="director-carousel">
        <h2>More by {directorName}</h2>
        <div className="no-movies">No other movies found for this director</div>
      </div>
    );
  }

  return (
    <div className="director-carousel">
      <h2>More by {directorName}</h2>
      <div className="carousel-wrapper">
        <button className="arrow left-arrow" onClick={prevSlide} aria-label="Previous">
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
              <div className="image-container" onClick={() => handleMovieClick(movie)}>
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="carousel-image"
                />
              </div>
            </div>
          ))}
        </div>
        <button className="arrow right-arrow" onClick={nextSlide} aria-label="Next">
          &#8250;
        </button>
      </div>

      <style jsx>{`
        .director-carousel {
          margin: 40px 0;
          padding: 0 20px;
          position: relative;
        }
        h2 {
          color: white;
          margin-bottom: 20px;
          font-size: 1.5rem;
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
          width: 100%;
        }
        .carousel-item {
          flex: 0 0 10%;
          padding: 0 5px;
          box-sizing: border-box;
        }
        .image-container {
          position: relative;
          width: 100%;
          padding-top: 150%;
          overflow: hidden;
          border-radius: 8px;
          cursor: pointer;
        }
        .carousel-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }
        .carousel-image:hover {
          transform: scale(1.05);
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
        }
        .left-arrow {
          left: 0;
        }
        .right-arrow {
          right: 0;
        }
        .loading, .error, .no-movies {
          color: white;
          text-align: center;
          padding: 20px;
        }
        .error {
          color: #ff6b6b;
        }
        .no-movies {
          color: #adb5bd;
          font-style: italic;
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
        }
      `}</style>
    </div>
  );
};

export default DirectorMovieCarousel;