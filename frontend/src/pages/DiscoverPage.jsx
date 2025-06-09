import React from 'react';
import MovieCarousel from '../components/Carousel'
import PopularCarousel from '../components/PopularCarousel'
import Toolbar from '../components/Toolbar'
import MovieDetails from '../components/MovieDetails';
import CardStackCarousel from '../components/DiscoverCardstack';
const DiscoverPage = () => {
  return (
    <div style={{//gradient for background of page
      minHeight: '100vh',
      backgroundImage: "radial-gradient(circle at center center, rgb(87,0,108), rgb(16,0,43))",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      <Toolbar />
      <CardStackCarousel />
    </div>
  );
};

export default DiscoverPage;