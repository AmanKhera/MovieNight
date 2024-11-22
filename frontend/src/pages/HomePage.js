import React from 'react';
import TestComp1 from '../components/TestComp1';
import TestComp2 from '../components/TestComp2';
import MovieCarousel from '../components/Carousel'

const HomePage = () => {
  return (
    <div>
      <TestComp1/>
      <TestComp2/>
      <MovieCarousel title="Input Goes Here and changes Title"/>
    </div>
  );
};

export default HomePage;