// src/pages/HomePage.jsx
import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Toolbar from '../components/Toolbar';
import MovieCarousel from '../components/Carousel';
import DiscoverCarousel from '../components/DiscoverCarousel';
import PopularCarousel from '../components/PopularCarousel';
import MainLayout from "../components/MainLayout";
import { fetchRecentlyWatched } from '../api';

const HomePage = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const prefetchData = async () => {
      try {
        const data = await queryClient.fetchQuery({
          queryKey: ["recentlyWatched"],
          queryFn: fetchRecentlyWatched,
        });
        console.log("Prefetched data in HomePage:", data);
      } catch (err) {
        console.error("Prefetch error in HomePage:", err.message);
      }
    };

    prefetchData();
  }, [queryClient]);

  return (
    //<HomePage>
    <div>
      <Toolbar />
      <main>
        <PopularCarousel title="Top Popular Movies" />
        <DiscoverCarousel id="war" />
        <DiscoverCarousel id="comedy" />
        <DiscoverCarousel id="history" />
        <DiscoverCarousel id="thriller" />
      </main>
    </div>
    //</HomePage>
  );
};

export default HomePage;