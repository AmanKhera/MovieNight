// src/components/DiscoverCardStack.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const CARD_WIDTH = 400;
const CARD_HEIGHT = 550;
const ARROW_GAP = 200;

const DiscoverCardStack = ({ title = "Movie Stack" }) => {
  const [movies, setMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await fetch("http://localhost:8000/popular_movie/");
        if (!res.ok) throw new Error("Failed to fetch movies");
        const data = await res.json();
        const filtered = (data.results || []).filter(m => m.backdrop_path);
        setMovies(filtered);
      } catch (e) {
        console.error(e);
      }
    };
    fetchMovies();
  }, []);

  const prev = () => {
    setFlipped(false);
    setCurrentIndex(i => (i === 0 ? movies.length - 1 : i - 1));
  };
  const next = () => {
    setFlipped(false);
    setCurrentIndex(i => (i === movies.length - 1 ? 0 : i + 1));
  };

  const goToDetail = (movie, e) => {
    e.stopPropagation();
    const titleParam = encodeURIComponent(
      movie.title || movie.original_title
    );
    navigate(
      `/movie/${titleParam}?release_date=${movie.release_date}`
    );
  };

  if (!movies.length) return <div>Loading movies…</div>;

  const stack = [0, 1, 2].map(offset =>
    movies[(currentIndex + offset) % movies.length]
  );

  return (
    <div className="card-stack-carousel">
      <div className="carousel-title">{title}</div>
      <div className="stack-container">
        <button className="arrow left" onClick={prev}>&#10094;</button>
        <button className="arrow right" onClick={next}>&#10095;</button>

        {stack
          .map((movie, idx) => {
            const z = stack.length - idx;
            const scale = 1 - idx * 0.07;
            const yOff = idx * 30;

            if (idx === 0) {
              return (
                <div
                  key={movie.id}
                  className="card-container"
                  style={{ zIndex: z, transform: `translate(-50%, ${yOff}px) scale(${scale})` }}
                  onClick={() => setFlipped(f => !f)}
                >
                  <div className={`card-inner ${flipped ? 'flipped' : ''}`}>
                    <div className="card-front">
                      <img
                        src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
                        alt={movie.title || movie.original_title}
                      />
                      <div className="info">
                        <h3>{movie.title || movie.original_title}</h3>
                      </div>
                    </div>
                    <div className="card-back">
                      <h3>{movie.title || movie.original_title}</h3>
                      <p className="detail-text"><strong>Release:</strong> {movie.release_date}</p>
                      <p className="detail-text"><strong>Rating:</strong> {movie.vote_average}/10</p>
                      <p className="overview">{movie.overview}</p>
                      <button
                        className="details-btn"
                        onClick={e => goToDetail(movie, e)}
                      >
                        Movie Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            } else {
              return (
                <div
                  key={movie.id}
                  className="card"
                  style={{ zIndex: z, transform: `translate(-50%, ${yOff}px) scale(${scale})` }}
                >
                  <img
                    src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
                    alt={movie.title || movie.original_title}
                  />
                  <div className="info">
                    <h3>{movie.title || movie.original_title}</h3>
                  </div>
                </div>
              );
            }
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
          cursor: pointer;
          transition: transform 0.4s ease;
        }
        .card-container {
          perspective: 1200px;
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
        }
        .card-front img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .info {
          position: absolute;
          bottom: 0;
          width: 100%;
          padding: 12px;
          background: linear-gradient(to top, rgba(0,0,0,0.85), transparent);
          color: #fff;
          text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        }
        .card-back {
          background: #111;
          color: #fff;
          transform: rotateY(180deg);
          padding: 20px;
          box-sizing: border-box;
        }
        .card-back h3 {
          margin: 0 0 10px;
          font-size: 1.4rem;
        }
        .detail-text {
          font-size: 1.1rem;
          margin: 4px 0;
        }
        .overview {
          flex: 1;
          font-size: 1rem;
          overflow: auto;
          margin: 8px 0;
        }
        .details-btn {
          padding: 10px 16px;
          background: #7d00ff;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 1.1rem;
          cursor: pointer;
          align-self: center;
          margin-top: 12px;
          transition: background 0.3s;
        }
        .details-btn:hover {
          background: #9100ff;
        }
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
          z-index: 20;
          transition: background 0.3s;
        }
        .arrow:hover { background: rgba(125,0,255,0.8); }
        .left {
          left: ${ARROW_GAP}px;
          transform: translateY(-50%);
        }
        .right {
          right: ${ARROW_GAP}px;
          transform: translateY(-50%);
        }
      `}</style>
    </div>
  );
};

export default DiscoverCardStack;
