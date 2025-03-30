// src/components/WatchlistCarousel.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const WatchlistCarousel = ({ title = "Your Watchlist" }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: movies, isLoading, error } = useQuery({
    queryKey: ['watchlistMovies'],
    queryFn: () => queryClient.getQueryData(['watchlistMovies']) || [],
  });

  const handleMovieClick = (movie) => {
    const titleParam = encodeURIComponent(movie.title || movie.original_title);
    const releaseDate = movie.release_date;
    if (releaseDate) {
      navigate(`/movie/${titleParam}?release_date=${encodeURIComponent(releaseDate)}`);
    } else {
      navigate(`/movie/${titleParam}`);
    }
  };

  const handleSeeMore = () => {
    navigate("/UserWatchlists");
  };

  const getPosterUrl = (movie) => {
    if (movie.poster) {
      return movie.poster;
    }
    return "https://via.placeholder.com/200x300?text=No+Image";
  };

  if (isLoading) {
    return <div>Loading watchlist movies...</div>;
  }

  if (error) {
    return <div className={`message error`}>{error.message}</div>;
  }

  if (!movies || movies.length === 0) {
    return <div>No movies in your watchlist.</div>;
  }

  return (
    <div className="watchlist-carousel">
      <div className="carousel-header">
        <h2>{title}</h2>
        <button className="see-more-button" onClick={handleSeeMore} title="See More">
          &#8599;
        </button>
      </div>
      <div className="movies-row">
        {movies.map((movie, index) => (
          <div
            className="movie-item"
            key={`${movie.id}-${index}`}
            onClick={() => handleMovieClick(movie)}
          >
            <div className="poster">
              <img src={getPosterUrl(movie)} alt={movie.title || movie.original_title} />
            </div>
            <div className="movie-title">
              {movie.title || movie.original_title}
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .watchlist-carousel {
          width: 100%;
          margin: 0 auto;
          background-color: #240046;
          color: #fff;
          padding: 5px 20px 35px 20px;
          box-sizing: border-box;
        }
        .carousel-header {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }
        .carousel-header h2 {
          font-size: 1.8rem;
          margin: 0;
          text-align: center;
        }
        .see-more-button {
          background: none;
          border: none;
          color: #fff;
          font-size: 1.8rem;
          margin-left: 10px;
          cursor: pointer;
        }
        .see-more-button:hover {
          color: #ff9800;
        }
        .message {
          margin-bottom: 20px;
          padding: 10px 20px;
          border-radius: 5px;
          text-align: center;
        }
        .message.error {
          background-color: #f44336;
          color: white;
        }
        .movies-row {
          display: flex;
          justify-content: space-between;
          flex-wrap: nowrap;
        }
        .movie-item {
          flex: 1 1 calc(100% / 7 - 10px);
          margin: 0 5px;
          cursor: pointer;
          text-align: center;
        }
        .poster {
          width: 100%;
          height: 237px;
          border-radius: 8px;
          overflow: hidden;
          background-color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .poster img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .poster img:hover {
          transform: scale(1.05);
        }
        .movie-title {
          margin-top: 8px;
          font-size: 1rem;
          line-height: 1.2;
          min-height: 2.4em;
        }
      `}</style>
    </div>
  );
};

export default WatchlistCarousel;