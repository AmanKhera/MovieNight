import React, { useState, useEffect } from "react";
import "./Carousel.css";

const Carousel = ({ title = "In a Mood" }) => {
  const shows = Array.from({ length: 20 }, (_, index) => ({
    title: `Placeholder ${index + 1}`,
    imgSrc: `https://via.placeholder.com/200x300?text=Placeholder+${index + 1}`,
  }));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Adjust the number of visible items based on window size
  useEffect(() => {
    const updateItemsPerPage = () => {
      const width = window.innerWidth;
      if (width >= 1200) setItemsPerPage(5);
      else if (width >= 992) setItemsPerPage(4);
      else if (width >= 768) setItemsPerPage(3);
      else setItemsPerPage(2);
    };

    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);

    return () => {
      window.removeEventListener("resize", updateItemsPerPage);
    };
  }, []);

  // Clone the first and last few items to allow smooth infinite scrolling
  const totalItems = shows.length;
  const extendedItems = [
    ...shows.slice(-itemsPerPage), // Clone the last few items
    ...shows,
    ...shows.slice(0, itemsPerPage), // Clone the first few items
  ];

  // Handle next slide
  const nextSlide = () => {
    if (!isTransitioning) {
      setIsTransitioning(true);
      setCurrentIndex((prevIndex) => prevIndex + 1);
    }
  };

  // Handle previous slide
  const prevSlide = () => {
    if (!isTransitioning) {
      setIsTransitioning(true);
      setCurrentIndex((prevIndex) => prevIndex - 1);
    }
  };

  // Reset position after transition for infinite scrolling
  const handleTransitionEnd = () => {
    setIsTransitioning(false);
    if (currentIndex === totalItems) {
      setCurrentIndex(0); // Reset to the first item
    } else if (currentIndex === -1) {
      setCurrentIndex(totalItems - 1); // Reset to the last item
    }
  };

  const getTransformStyle = () => {
    const translateValue =
      ((currentIndex + itemsPerPage) * 100) / itemsPerPage;
    return `translateX(-${translateValue}%)`;
  };

  return (
    <div className="carousel">
      <h2>{title}</h2>
      <div className="carousel-wrapper">
        <button className="arrow left-arrow" onClick={prevSlide}>
          &#8249;
        </button>
        <div
          className="carousel-container"
          style={{
            transform: getTransformStyle(),
            transition: isTransitioning ? "transform 0.5s ease-in-out" : "none",
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {extendedItems.map((show, index) => (
            <div
              className="carousel-item"
              key={index}
              style={{
                width: `calc(${100 / itemsPerPage}% - 10px)`,
              }}
            >
              <img src={show.imgSrc} alt={show.title} className="carousel-image" />
              <div className="carousel-info">
                <h3>{show.title}</h3>
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

export default Carousel;
