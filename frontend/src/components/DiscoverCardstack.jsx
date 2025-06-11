import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaTimes, FaCheck } from "react-icons/fa";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import {
  fetchUserInfo,
  fetchMovieRecommendations,
  fetchMovieDetailsByTitle,
  fetchMoviePoster,
} from "../api";

const CARD_WIDTH = 550;
const CARD_HEIGHT = 700;
const SPACING_FACTOR = 0.7;
const VISIBLE_RANGE = 3;

const DiscoverCardstack = ({ title = "Movie Carousel" }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [movieTitles, setMovieTitles] = useState([]);

  const [reviewCount, setReviewCount] = useState(0);

  const [notifVisible, setNotifVisible] = useState(false);
  const [notifMessage, setNotifMessage] = useState("");

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: userInfo, isLoading: userLoading } = useQuery({
    queryKey: ["userInfo"],
    queryFn: fetchUserInfo,
    staleTime: Infinity,
  });

  const {
    data: recommendations,
    isLoading: recLoading,
    refetch: refetchRecommendations,
  } = useQuery({
    queryKey: ["recommendations", userInfo?.id],
    queryFn: () => fetchMovieRecommendations(userInfo?.id),
    enabled: !!userInfo?.id,
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (recLoading || !recommendations?.summary?.recommendations) {
      return;
    }

    const fetched = recommendations.summary.recommendations;

    if (movieTitles.length === 0) {
      setMovieTitles(fetched);
      setCurrentIndex(0);
      setFlipped(false);

      fetched.forEach((movTitle) => {
        queryClient.prefetchQuery(
          ["movieDetails", movTitle],
          () => fetchMovieDetailsByTitle(movTitle)
        );
        queryClient.prefetchQuery(
          ["moviePoster", movTitle],
          () => fetchMoviePoster(movTitle)
        );
      });
    } else {
      const unseen = fetched.filter((t) => !movieTitles.includes(t));
      if (unseen.length > 0) {
        unseen.forEach((movTitle) => {
          queryClient.prefetchQuery(
            ["movieDetails", movTitle],
            () => fetchMovieDetailsByTitle(movTitle)
          );
          queryClient.prefetchQuery(
            ["moviePoster", movTitle],
            () => fetchMoviePoster(movTitle)
          );
        });
        setMovieTitles((prev) => [...prev, ...unseen]);
      }
    }

    setReviewCount(0);
  }, [recLoading, recommendations]);

  const movieDetailsQueries = useQueries({
    queries:
      movieTitles.map((movTitle) => ({
        queryKey: ["movieDetails", movTitle],
        queryFn: () => fetchMovieDetailsByTitle(movTitle),
        staleTime: Infinity,
      })) || [],
  });

  const moviePosterQueries = useQueries({
    queries:
      movieTitles.map((movTitle) => ({
        queryKey: ["moviePoster", movTitle],
        queryFn: () => fetchMoviePoster(movTitle),
        staleTime: Infinity,
      })) || [],
  });

  useEffect(() => {
    if (movieTitles.length === 0) return;
    if (moviePosterQueries.some((q) => q.isLoading)) return;

    const filtered = movieTitles.filter((title, idx) => {
      const posterResult = moviePosterQueries[idx];
      return posterResult.isSuccess && posterResult.data;
    });

    if (filtered.length !== movieTitles.length) {
      setMovieTitles(filtered);
      setCurrentIndex(0);
      setFlipped(false);
    }
  }, [moviePosterQueries]);

  const movies = movieTitles.map((movTitle, idx) => ({
    id: movTitle,
    title: movTitle,
    ...(movieDetailsQueries[idx]?.data || {}),
    poster_url: moviePosterQueries[idx]?.data || "",
  }));

  const handleReview = (movieTitle, liked) => {
    if (!userInfo?.id) return;

    fetch("http://localhost:8000/movie_review/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userInfo.id,
        movie_title: movieTitle,
        review: liked,
      }),
    })
      .then((res) => {
        setNotifMessage(
          liked
            ? "Movie recommended successfully."
            : "Movie marked as disliked."
        );
        setNotifVisible(true);
        setTimeout(() => setNotifVisible(false), 2500);

        setReviewCount((prev) => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            refetchRecommendations();
            return 0;
          }
          return newCount;
        });
      })
      .catch((err) => {
        console.error(err);
        setNotifMessage("Something went wrong.");
        setNotifVisible(true);
        setTimeout(() => setNotifVisible(false), 2500);
      });
  };

  const removeMovie = (movieTitle) => {
    const idx = movieTitles.indexOf(movieTitle);
    if (idx === -1) return;

    const newTitles = movieTitles.filter((t) => t !== movieTitle);

    if (newTitles.length === 0) {
      setMovieTitles([]);
      setCurrentIndex(0);
      setFlipped(false);
    } else {
      let newIndex = currentIndex;
      if (currentIndex > idx) {
        newIndex = currentIndex - 1;
      } else if (currentIndex === idx) {
        if (newIndex >= newTitles.length) {
          newIndex = 0;
        }
      }
      setMovieTitles(newTitles);
      setCurrentIndex(newIndex);
      setFlipped(false);
    }
  };

  const prev = () => {
    setFlipped(false);
    setCurrentIndex((i) =>
      movies.length === 0 ? 0 : i === 0 ? movies.length - 1 : i - 1
    );
  };

  const next = () => {
    setFlipped(false);
    setCurrentIndex((i) =>
      movies.length === 0
        ? 0
        : i === movies.length - 1
        ? 0
        : i + 1
    );
  };

  const goToDetail = (movie, e) => {
    e.stopPropagation();
    const tp = encodeURIComponent(movie.title);
    navigate(`/movie/${tp}?release_date=${movie.release_date}`);
  };

  if (userLoading || recLoading) {
    return <div className="loading-text">Loading recommendations...</div>;
  }
  if (!movies.length) {
    return <div className="loading-text">No more movies to show</div>;
  }

  const visibleItems = [];
  for (let offset = -VISIBLE_RANGE; offset <= VISIBLE_RANGE; offset++) {
    const idx =
      ((currentIndex + offset) % movies.length + movies.length) %
      movies.length;
    visibleItems.push({
      movie: movies[idx],
      offset,
    });
  }

  return (
    <div className="carousel-wrapper">
      <div className={`toast-notification ${notifVisible ? "show" : ""}`}>
        {notifMessage}
      </div>

      <h2 className="carousel-title">{title}</h2>

      <div className="carousel-container">
        <button className="arrow left" onClick={prev}>
          &#10094;
        </button>
        <button className="arrow right" onClick={next}>
          &#10095;
        </button>

        <div className="cards-container">
          {visibleItems.map(({ movie, offset }) => {
            const absOffset = Math.abs(offset);
            const scale = 1 - absOffset * 0.15;
            const xOffset = offset * (CARD_WIDTH * SPACING_FACTOR);
            const zIndex = VISIBLE_RANGE - absOffset + 1;
            const isCenter = offset === 0;

            return (
              <div
                key={movie.id}
                className="carousel-item"
                style={{
                  width: `${CARD_WIDTH}px`,
                  height: `${CARD_HEIGHT}px`,
                  transform: `translateX(${xOffset}px) scale(${scale})`,
                  zIndex,
                  opacity: 1,
                  transition: "transform 0.5s ease, opacity 0.5s ease",
                }}
                onClick={isCenter ? () => setFlipped((f) => !f) : undefined}
              >
                {isCenter ? (
                  <div
                    className={`carousel-item-inner ${
                      flipped ? "flipped" : ""
                    }`}
                  >
                    <div className="carousel-item-front">
                      <img
                        src={movie.poster_url || "/placeholder-movie.jpg"}
                        alt={movie.title}
                        loading="lazy"
                      />

                      <button
                        className="icon-btn dislike"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReview(movie.title, false);
                          removeMovie(movie.title);
                        }}
                      >
                        <FaTimes />
                      </button>
                      <button
                        className="icon-btn like"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReview(movie.title, true);
                          removeMovie(movie.title);
                        }}
                      >
                        <FaCheck />
                      </button>
                    </div>

                    <div className="carousel-item-back">
                      <h3>{movie.title}</h3>
                      <p>
                        <strong>Year:</strong> {movie.year}
                      </p>
                      <p>
                        <strong>Runtime:</strong> {movie.runtime}
                      </p>
                      <p>
                        <strong>Rating:</strong> {movie.rating}
                      </p>
                      <p>
                        <strong>Director:</strong> {movie.director}
                      </p>
                      <p className="overview">{movie.plot}</p>
                      <button
                        className="details-btn"
                        onClick={(e) => goToDetail(movie, e)}
                      >
                        Movie Details
                      </button>
                    </div>
                  </div>
                ) : (
                  <img
                    src={movie.poster_url || "/placeholder-movie.jpg"}
                    alt={movie.title}
                    loading="lazy"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .carousel-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto 50px;
          padding: 0 10px;
        }

        .carousel-title {
          color: #fff;
          font-size: 1.8rem;
          font-weight: bold;
          text-transform: uppercase;
          margin: 100px 0;
          text-align: center;
        }

        .loading-text {
          color: #fff;
          text-align: center;
          padding: 2rem;
          font-size: 1.2rem;
        }

        .carousel-container {
          position: relative;
          width: 100%;
          height: 600px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .cards-container {
          position: relative;
          width: ${CARD_WIDTH}px;
          height: ${CARD_HEIGHT}px;
          overflow: visible;
        }

        .carousel-item {
          position: absolute;
          top: 0;
          left: 0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.7);
          background: #111;
          cursor: pointer;
        }

        .carousel-item-inner {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.6s ease;
        }
        .carousel-item-inner.flipped {
          transform: rotateY(180deg);
        }

        .carousel-item-front,
        .carousel-item-back {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          display: flex;
          flex-direction: column;
          color: #fff;
        }
        .carousel-item-front img,
        .carousel-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .carousel-item-back {
          background: #111;
          padding: 20px;
          box-sizing: border-box;
          overflow-y: auto;
          transform: rotateY(180deg);
        }
        .overview {
          flex: 1;
          font-size: 0.9rem;
          margin: 8px 0;
        }
        .details-btn {
          padding: 8px 12px;
          background: #7d00ff;
          border: none;
          color: #fff;
          border-radius: 6px;
          cursor: pointer;
          margin-top: auto;
        }
        .details-btn:hover {
          background: #6200cc;
        }

        .icon-btn {
          position: absolute;
          bottom: 12px;
          background: rgba(0, 0, 0, 0.7);
          border: none;
          padding: 10px;
          border-radius: 50%;
          color: #fff;
          font-size: 1.4rem;
          cursor: pointer;
          z-index: 5;
          transition: transform 0.1s, background 0.1s;
        }
        .icon-btn:active {
          transform: scale(0.85);
          background: rgba(255, 255, 255, 0.2);
        }
        .icon-btn.dislike {
          left: 12px;
          color: #ff4d4d;
        }
        .icon-btn.like {
          right: 12px;
          color: #4caf50;
        }

        .arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.5);
          border: none;
          color: #fff;
          font-size: 2rem;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          cursor: pointer;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .arrow.left {
          left: 10px;
        }
        .arrow.right {
          right: 10px;
        }
        .arrow:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .toast-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background-color: #4caf50;
          color: #fff;
          padding: 12px 20px;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          font-size: 1rem;
          opacity: 0;
          transform: translateY(-20px);
          pointer-events: none;
          transition: transform 0.3s ease, opacity 0.3s ease;
          z-index: 9999;
        }
        .toast-notification.show {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
};

export default DiscoverCardstack;