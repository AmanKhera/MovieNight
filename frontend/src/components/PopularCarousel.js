import React, { useState, useEffect } from "react";
import "./PopularCarousel.css";

const PopularCarousel = ({ title = "Popular Movies" }) => {
  const [movies, setMovies] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const itemsToScroll = 1; // Scroll one item per click
  const [currentIndex, setCurrentIndex] = useState(0); // Start in the center
  const [enableTransition, setEnableTransition] = useState(true);

  const totalItems = movies.length;

  // Fetch popular movies from the backend
  useEffect(() => {
    const fetchPopularMovies = async () => {
      try {
        const response = await fetch("http://localhost:8000/popular_movie/"); // Updated endpoint
        if (!response.ok) {
          throw new Error(`Failed to fetch popular movies: ${response.status}`);
        }
        const data = await response.json();
        setMovies(data.results || []); // Populate movies from the API response

        // Set the initial index to display the first movie smoothly
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
      // If at the end of extended items, wrap to the beginning
      setEnableTransition(false);
      setCurrentIndex(currentIndex - totalItems);
    } else if (currentIndex < itemsPerPage) {
      // If at the beginning of extended items, wrap to the end
      setEnableTransition(false);
      setCurrentIndex(currentIndex + totalItems);
    }
  };

  const getTransformStyle = () => {
    const movieWidth = 100 / itemsPerPage; // Each movie's width as a percentage
    const translateValue = currentIndex * movieWidth; // Exact movement
    return `translateX(-${translateValue}%)`;
  };

  if (movies.length === 0) {
    return <div>Loading popular movies...</div>; // Show loading message until data is fetched
  }

  return (
    <div className="popular-carousel">
      <h2>{title}</h2>
      <div className="carousel-wrapper">
        <button className="arrow left-arrow" onClick={prevSlide}>
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
              key={index}
              style={{ width: `${100 / itemsPerPage}%` }}
            >
              <img
                src={
                  movie.poster_path
                    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                    : "https://via.placeholder.com/200x300?text=No+Image"
                }
                alt={movie.title || movie.original_title}
                className="carousel-image"
              />
              <div className="carousel-info">
                <h3>{movie.title || movie.original_title}</h3>
              </div>
            </div>
          ))}
        </div>
        <button className="arrow right-arrow" onClick={nextSlide}>
          &#8250;
        </button>
      </div>
    </div>
  );
};

export default PopularCarousel;
