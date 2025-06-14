import React, { useState, useEffect } from "react";
import "./Carousel.css";
/**
 * 
 * --------------------------------- DEPRICATED -----------------------------
 * First iteration of the carousel, not used anymore replaced by Discover and Popular carousel.
 */
const Carousel = ({ title = "In a Mood" }) => {
  const shows = Array.from({ length: 20 }, (_, index) => ({
    title: `Placeholder ${index + 1}`,
    imgSrc: `https://via.placeholder.com/200x300?text=Placeholder+${index + 1}`,
  }));

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const itemsToScroll = 1;
  const [currentIndex, setCurrentIndex] = useState(itemsPerPage);
  const [enableTransition, setEnableTransition] = useState(true);
  const totalItems = shows.length;

  useEffect(() => {
    const updateItemsPerPage = () => {
      const width = window.innerWidth;
      let newItemsPerPage;
      if (width >= 1400) newItemsPerPage = 10;
      else if (width >= 1200) newItemsPerPage = 8;
      else if (width >= 992) newItemsPerPage = 6;
      else if (width >= 768) newItemsPerPage = 4;
      else newItemsPerPage = 2;
      setItemsPerPage((prevItemsPerPage) => {
        if (prevItemsPerPage !== newItemsPerPage) {
          setCurrentIndex((prevIndex) => prevIndex + (newItemsPerPage - prevItemsPerPage));
          return newItemsPerPage;
        }
        return prevItemsPerPage;
      });
    };

    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => {
      window.removeEventListener("resize", updateItemsPerPage);
    };
  }, []);

  const extendedItems = [
    ...shows.slice(-itemsPerPage),
    ...shows,
    ...shows.slice(0, itemsPerPage),
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
    } else if (currentIndex <= itemsPerPage - totalItems) {
      setEnableTransition(false);
      setCurrentIndex(currentIndex + totalItems);
    }
  };

  const getTransformStyle = () => {
    const itemWidthPercentage = 100 / itemsPerPage;
    const translateValue = currentIndex * itemWidthPercentage;
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
            transition: enableTransition ? "transform 0.5s ease-in-out" : "none",
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {extendedItems.map((show, index) => (
            <div
              className="carousel-item"
              key={index}
              style={{
                width: `${100 / itemsPerPage}%`,
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