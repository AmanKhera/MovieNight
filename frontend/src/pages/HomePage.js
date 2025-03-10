import React from 'react';
import MovieCarousel from '../components/Carousel';
import PopularCarousel from '../components/PopularCarousel';
import Toolbar from '../components/Toolbar';
import DiscoverCarousel from '../components/DiscoverCarousel';
import WatchlistCarousel from '../components/WatchlistCarousel';

const HomePage = () => {
  return (
    <div>
      <Toolbar />
        <PopularCarousel title="Top Popular Movies" />
        <WatchlistCarousel/>
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
