import React from 'react';
import MovieCarousel from '../components/Carousel';
import PopularCarousel from '../components/PopularCarousel';
import Toolbar from '../components/Toolbar';
import DiscoverCarousel from '../components/DiscoverCarousel';

const HomePage = () => {
  return (
    <div>
      <Toolbar />
        <PopularCarousel title="Top Popular Movies" />
        <DiscoverCarousel 
          id="war" 
        />
        <DiscoverCarousel id="comedy" />
        <DiscoverCarousel id="history" />
        <DiscoverCarousel id="thriller" />
    </div>
  );
};

export default HomePage;
