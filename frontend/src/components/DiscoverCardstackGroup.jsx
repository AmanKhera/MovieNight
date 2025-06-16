import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaTimes, FaCheck } from "react-icons/fa";

const CARD_WIDTH = 400;
const CARD_HEIGHT = 550;
const ARROW_GAP = 200;
/**
 * 
 * DEPREICATED COMPONENT
 * Used to be used in the Discover Page to show movie recommendations. Outdated by DiscoverCardstack component.
 */
const DiscoverCardStackGroup = ({ title = "Movie Stack", recId }) => {
  const [userId, setUserId] = useState(null);
  const [movies, setMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:8000/user_info/", { credentials: "include" })
      .then((r) => r.json())
      .then((js) => setUserId(js.id))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!userId || !recId) return;

    const fetchRecs = async () => {
      try {
        const recResp = await fetch(
          `http://localhost:8000/movie_rec/?id=${recId}`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId }),
          }
        );
        const recJson = await recResp.json();
        if (!recResp.ok) throw new Error(recJson.error || "Rec failed");

        const parsed = JSON.parse(recJson.summary);
        const titles = parsed.recommendations || [];

        const enriched = await Promise.all(
          titles.map(async (t) => {
            let info = {};
            try {
              const s = await fetch(
                `http://localhost:8000/search/?filter=movie&q=${encodeURIComponent(
                  t
                )}`
              );
              const sj = await s.json();
              if (s.ok && sj.movies?.length) info = sj.movies[0];
            } catch {}
            let poster_url = "";
            try {
              const p = await fetch(
                `http://localhost:8000/movie_poster/?title=${encodeURIComponent(
                  t
                )}`
              );
              const pj = await p.json();
              poster_url = pj.poster || "";
            } catch {}
            return {
              id: info.id || t,
              title: info.title || t,
              release_date: info.year || "",
              runtime: info.runtime || "",
              vote_average: info.rating || "",
              director: info.director || "",
              plot: info.plot || "",
              poster_url,
            };
          })
        );

        setMovies(enriched);
      } catch (e) {
        console.error(e);
      }
    };

    fetchRecs();
  }, [userId, recId]);

  const handleReview = (movieTitle, liked) => {
    if (!userId) return;
    fetch("http://localhost:8000/movie_review/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
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

  if (!movies.length) return <div>Loading recommendations…</div>;

  const stack = [0, 1, 2].map(
    (offset) => movies[(currentIndex + offset) % movies.length]
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
                    <div className="card-front">
                      <img src={movie.poster_url} alt={movie.title} />
                    </div>
                    <div className="card-back">
                      <h3>{movie.title}</h3>
                      <p>
                        <strong>Year:</strong> {movie.release_date}
                      </p>
                      <p>
                        <strong>Runtime:</strong> {movie.runtime}
                      </p>
                      <p>
                        <strong>Rating:</strong> {movie.vote_average}
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
                  <img src={movie.poster_url} alt={movie.title} />
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
          position: absolute; top: 0; left: 50%;
          width: ${CARD_WIDTH}px; height: ${CARD_HEIGHT}px;
          border-radius: 12px; overflow: hidden;
          box-shadow: 0 12px 24px rgba(0,0,0,0.7);
          background: #111; transition: transform 0.4s ease;
        }
        .card-container {
          perspective: 1200px; cursor: pointer;
        }
        .card-inner {
          width: 100%; height: 100%;
          position: relative; transform-style: preserve-3d;
          transition: transform 0.6s ease;
        }
        .card-inner.flipped {
          transform: rotateY(180deg);
        }
        .card-front, .card-back {
          position: absolute; top: 0; left: 0;
          width: 100%; height: 100%;
          backface-visibility: hidden;
          display: flex; flex-direction: column;
          color: #fff;
        }
        .card-front img, .card img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .card-back {
          background: #111; padding: 20px; box-sizing: border-box;
          overflow: auto; transform: rotateY(180deg);
        }
        .overview {
          flex: 1; font-size: 0.9rem; margin: 8px 0;
        }
        .details-btn {
          padding: 8px 12px; background: #7d00ff; border: none;
          color: #fff; border-radius: 6px; cursor: pointer;
          margin-top: auto;
        }
        .icon-btn {
          position: absolute; bottom: 12px;
          background: rgba(0, 0, 0, 0.7);
          border: none; padding: 10px; border-radius: 50%;
          color: #fff; font-size: 1.4rem; cursor: pointer;
          z-index: 5; transition: transform 0.1s, background 0.1s;
        }
        .icon-btn:active {
          transform: scale(0.85);
          background: rgba(255,255,255,0.2);
        }
        .icon-btn.dislike { left: 12px; color: #ff4d4d; }
        .icon-btn.like    { right: 12px; color: #4caf50; }
        .arrow {
          position: absolute; top: 50%; transform: translateY(-50%);
          background: rgba(0,0,0,0.5); border: none;
          color: #fff; font-size: 2rem; width: 50px;
          height: 50px; border-radius: 50%; cursor: pointer;
          z-index: 10;
        }
        .left  { left: ${ARROW_GAP}px; }
        .right { right: ${ARROW_GAP}px; }
      `}</style>
    </div>
  );
};

export default DiscoverCardStackGroup;