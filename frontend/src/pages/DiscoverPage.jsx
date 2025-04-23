import React from 'react';
import MovieCarousel from '../components/Carousel'
import PopularCarousel from '../components/PopularCarousel'
import Toolbar from '../components/Toolbar'
import MovieDetails from '../components/MovieDetails';
import CardStackCarousel from '../components/DiscoverCardstack';
const DiscoverPage = () => {
  return (
    <div>
      <Toolbar/>
      <CardStackCarousel/>
    </div>
  );
};

export default DiscoverPage;