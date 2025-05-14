import React from 'react';
import MovieCarousel from '../components/Carousel'
import PopularCarousel from '../components/PopularCarousel'
import Toolbar from '../components/Toolbar'
import MovieDetails from '../components/MovieDetails';
const MovieDetailsPage = () => {
  return (
    <div>
        <Toolbar />
        <MovieDetails />
    </div>
  );
};

export default MovieDetailsPage;