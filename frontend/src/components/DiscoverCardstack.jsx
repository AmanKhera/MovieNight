// src/components/DiscoverCardStack.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaTimes, FaCheck } from "react-icons/fa";
import { useQuery, useQueries } from "@tanstack/react-query";
import { fetchUserInfo, fetchMovieRecommendations, fetchMovieDetailsByTitle, fetchMoviePoster } from "../api";

const CARD_WIDTH = 400;
const CARD_HEIGHT = 550;
const ARROW_GAP = 200;

const DiscoverCardStack = ({ title = "Movie Stack" }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const navigate = useNavigate();

  // Fetch user info
  const { data: userInfo, isLoading: userLoading } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo,
    staleTime: Infinity
  });

  // Fetch recommendations
  const { data: recommendations, isLoading: recLoading } = useQuery({
    queryKey: ['recommendations', userInfo?.id],
    queryFn: () => fetchMovieRecommendations(userInfo?.id),
    enabled: !!userInfo?.id,
    staleTime: 1000 * 60 * 10 // 10 minutes
  });

  // Fetch details for all recommended movies
  const movieDetailsQueries = useQueries({
    queries: (recommendations?.summary.recommendations || []).map(title => ({
      queryKey: ['movieDetails', title],
      queryFn: () => fetchMovieDetailsByTitle(title),
      staleTime: Infinity
    }))
  });

  // Fetch posters for all recommended movies
  const moviePosterQueries = useQueries({
    queries: (recommendations?.summary.recommendations || []).map(title => ({
      queryKey: ['moviePoster', title],
      queryFn: () => fetchMoviePoster(title),
      staleTime: Infinity
    }))
  });

  // Combine all data into movies array
  const movies = recommendations?.summary.recommendations?.map((title, index) => ({
    id: title,
    title,
    ...(movieDetailsQueries[index]?.data || {}),
    poster_url: moviePosterQueries[index]?.data || "",
  })) || [];

  // Send like/dislike to backend
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
    }).catch(console.error);
  };

  const prev = () => {
    setFlipped(false);
    setCurrentIndex((i) => (i === 0 ? movies.length - 1 : i - 1));
  };

  const next = () => {
    setFlipped(false);
    setCurrentIndex((i) => (i === movies.length - 1 ? 0 : i + 1));
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
    return <div className="loading-text">No recommendations found</div>;
  }

  const stack = [0, 1, 2].map((offset) =>
    movies[(currentIndex + offset) % movies.length]
  );

  return (
    <div className="card-stack-carousel">
      <div className="carousel-title">{title}</div>
      <div className="stack-container">
        <button className="arrow left" onClick={prev}>
          &#10094;
        </button>
        <button className="arrow right" onClick={next}>
          &#10095;
        </button>

        {stack
          .map((movie, idx) => {
            const z = stack.length - idx;
            const scale = 1 - idx * 0.07;
            const yOff = idx * 30;
            const style = {
              zIndex: z,
              transform: `translate(-50%, ${yOff}px) scale(${scale})`,
            };
            const isTop = idx === 0;

            return (
              <div
                key={movie.id}
                className={isTop ? "card-container" : "card"}
                style={style}
                onClick={isTop ? () => setFlipped((f) => !f) : undefined}
              >
                {isTop ? (
                  <div className={`card-inner ${flipped ? "flipped" : ""}`}>
                    {/* Front */}
                    <div className="card-front">
                      <img 
                        src={movie.poster_url || '/placeholder-movie.jpg'} 
                        alt={movie.title}
                        loading="lazy"
                      />
                    </div>
                    
                    {/* Back */}
                    <div className="card-back">
                      <h3>{movie.title}</h3>
                      <p><strong>Year:</strong> {movie.release_date}</p>
                      <p><strong>Runtime:</strong> {movie.runtime}</p>
                      <p><strong>Rating:</strong> {movie.vote_average}</p>
                      <p><strong>Director:</strong> {movie.director}</p>
                      <p className="overview">{movie.plot}</p>
                      <button
                        className="details-btn"
                        onClick={(e) => goToDetail(movie, e)}
                      >
                        Movie Details
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <button
                      className="icon-btn dislike"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReview(movie.title, false);
                        setTimeout(next, 500);
                      }}
                    >
                      <FaTimes />
                    </button>
                    <button
                      className="icon-btn like"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReview(movie.title, true);
                        setTimeout(next, 500);
                      }}
                    >
                      <FaCheck />
                    </button>
                  </div>
                ) : (
                  <img 
                    src={movie.poster_url || '/placeholder-movie.jpg'} 
                    alt={movie.title}
                    loading="lazy"
                  />
                )}
              </div>
            );
          })
          .reverse()}
      </div>

      <style>{`
        .card-stack-carousel {
          position: relative;
          width: 100%;
          max-width: 1000px;
          margin: 0 auto 50px;
          padding: 0 10px;
        }
        .loading-text {
          color: #fff;
          text-align: center;
          padding: 2rem;
          font-size: 1.2rem;
        }
        .carousel-title {
          color: #fff;
          font-size: 1.6rem;
          font-weight: bold;
          margin-bottom: 15px;
          text-transform: uppercase;
          text-align: center;
        }
        .stack-container {
          position: relative;
          height: 600px;
        }
        .card-container, .card {
          position: absolute; 
          top: 0; 
          left: 50%;
          width: ${CARD_WIDTH}px; 
          height: ${CARD_HEIGHT}px;
          border-radius: 12px; 
          overflow: hidden;
          box-shadow: 0 12px 24px rgba(0,0,0,0.7);
          background: #111; 
          transition: transform 0.4s ease;
        }
        .card-container {
          perspective: 1200px; 
          cursor: pointer;
        }
        .card-inner {
          width: 100%; 
          height: 100%;
          position: relative; 
          transform-style: preserve-3d;
          transition: transform 0.6s ease;
        }
        .card-inner.flipped {
          transform: rotateY(180deg);
        }
        .card-front, .card-back {
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
        .card-front img, .card img {
          width: 100%; 
          height: 100%; 
          object-fit: cover;
        }
        .card-back {
          background: #111; 
          padding: 20px; 
          box-sizing: border-box;
          overflow: auto; 
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
          background: rgba(255,255,255,0.2);
        }
        .icon-btn.dislike { left: 12px; color: #ff4d4d; }
        .icon-btn.like    { right: 12px; color: #4caf50; }
        .arrow {
          position: absolute; 
          top: 50%; 
          transform: translateY(-50%);
          background: rgba(0,0,0,0.5); 
          border: none;
          color: #fff; 
          font-size: 2rem; 
          width: 50px;
          height: 50px; 
          border-radius: 50%; 
          cursor: pointer;
          z-index: 10;
        }
        .left  { left: ${ARROW_GAP}px; }
        .right { right: ${ARROW_GAP}px; }
      `}</style>
    </div>
  );
};

export default DiscoverCardStack;