import React from 'react';
import MovieCarousel from '../components/Carousel';
import PopularCarousel from '../components/PopularCarousel';
import Toolbar from '../components/Toolbar';
import DiscoverCarousel from '../components/DiscoverCarousel';
import UserWatchlists from '../components/UserWatchlists';

const UserWatchlistPage = () => {
  return (
    <div>
      <Toolbar />
      <UserWatchlists/>
    </div>
  );
};

export default UserWatchlistPage;
