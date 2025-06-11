import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Toolbar from '../components/Toolbar';
import MovieCarousel from '../components/Carousel';
import DiscoverCarousel from '../components/DiscoverCarousel';
import PopularCarousel from '../components/PopularCarousel';
import { fetchRecentlyWatched } from '../api';
import Footbar from '../components/Footbar';
import PopularToolbar from '../components/PopularToobar';

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
    <div>
      <PopularToolbar />
      <PopularCarousel title="" />
      <DiscoverCarousel id="war" />
      <DiscoverCarousel id="comedy" />
      <DiscoverCarousel id="history" />
      <DiscoverCarousel id="thriller" />
      <Footbar />
    </div>
  );
};

export default HomePage;