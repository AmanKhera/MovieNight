import React from 'react';
import MovieCarousel from '../components/Carousel'
import PopularCarousel from '../components/PopularCarousel'
import Toolbar from '../components/Toolbar'
import MovieDetails from '../components/MovieDetails';
import ReviewedMoviesPage from '../components/ReviewedMoviePage';
const ReviewPage = () => {
  return (
    <main>
      <div>
        <Toolbar />
        <ReviewedMoviesPage />
      </div>
    </main>
  );
};

export default ReviewPage;