import React from 'react';
import MovieCarousel from '../components/Carousel';
import Toolbar from '../components/Toolbar';
import DiscoverCarousel from '../components/DiscoverCarousel';
import PopularCarousel from '../components/PopularCarousel';

const HomePage = () => {
  return (
    <div>
      <Toolbar />
        <PopularCarousel title="Top Popular Movies" />
        <DiscoverCarousel id="war" />
        <DiscoverCarousel id="comedy" />
        <DiscoverCarousel id="history" />
        <DiscoverCarousel id="thriller" />
    </div>
  );
};

export default HomePage;
