import React from 'react';
import MovieCarousel from '../components/Carousel'
import PopularCarousel from '../components/PopularCarousel'
import Toolbar from '../components/Toolbar'

const HomePage = () => {
  return (
    <div>
      <Toolbar/>
      <PopularCarousel title="Top Popular Movies"/>  {/* To use the MovieCarousel copy the code on the left and change the title to whichever string you want to display at the top of the Carousel*/}
      <PopularCarousel title="Top Popular Movies"/>  {/* To use the MovieCarousel copy the code on the left and change the title to whichever string you want to display at the top of the Carousel*/}
    </div>
  );
};

export default HomePage;