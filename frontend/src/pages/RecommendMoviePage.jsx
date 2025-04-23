import React from 'react';
import MovieCarousel from '../components/Carousel'
import PopularCarousel from '../components/PopularCarousel'
import Toolbar from '../components/Toolbar'
import MovieDetails from '../components/MovieDetails';
import RecommendMovie from '../components/RecommendMovie';
const RecommendationMoviePage = () => {
  return (
    <div>
      <Toolbar/>
      <RecommendMovie/>
    </div>
  );
};

export default RecommendationMoviePage;