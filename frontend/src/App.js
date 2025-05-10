// src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import HomePage from './pages/HomePage';
import MovieDetailsPage from './pages/MovieDetails';
import GroupPage from './pages/GroupPage';
import UserWatchlistPage from './pages/UserWatchlistPage';
import SearchPage from './pages/SearchPage';
import UserPage from './pages/UserPage';
import FriendsPage from './pages/FriendsPage';
import DiscoverPage from './pages/DiscoverPage';
import ReviewPage from './pages/ReviewPage';
import {
  fetchUserInfo,
  fetchRecentlyWatched,
  fetchWatchlistMovies,
  fetchMovieRecommendations,
  fetchMovieDetailsByTitle,
  fetchMoviePoster,

} from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
});

persistQueryClient({
  queryClient,
  persister: localStoragePersister,
});

function App() {
  useEffect(() => {
    async function prefetchCriticalData() {
      try {
        // Prefetch user info first
        const userInfo = await queryClient.fetchQuery({
          queryKey: ['userInfo'],
          queryFn: fetchUserInfo,
          staleTime: Infinity
        });

        // Parallel prefetch of all essential data
        await Promise.all([
          // Core user data
          queryClient.prefetchQuery({
            queryKey: ['recentlyWatched'],
            queryFn: fetchRecentlyWatched,
          }),
          queryClient.prefetchQuery({
            queryKey: ['watchlistMovies'],
            queryFn: fetchWatchlistMovies,
          }),
          queryClient.prefetchQuery({
            queryKey: ['reviewedMovies', userInfo.id],
            queryFn: () => fetchRecentlyWatched(userInfo.id),
          }),
          
          
          
          // Recommendations pipeline
          queryClient.prefetchQuery({
            queryKey: ['recommendations', userInfo.id],
            queryFn: () => fetchMovieRecommendations(userInfo.id),
          }).then(async () => {
            const recommendations = queryClient.getQueryData(['recommendations', userInfo.id]);
            if (recommendations?.summary?.recommendations) {
              await Promise.all(
                recommendations.summary.recommendations.map(async (title) => {
                  await queryClient.prefetchQuery({
                    queryKey: ['movieDetails', title],
                    queryFn: () => fetchMovieDetailsByTitle(title),
                    staleTime: Infinity
                  });
                  await queryClient.prefetchQuery({
                    queryKey: ['moviePoster', title],
                    queryFn: () => fetchMoviePoster(title),
                    staleTime: Infinity
                  });
                })
              );
            }
          })
        ]);
        
        console.log("Critical data prefetched successfully");
      } catch (error) {
        console.error("Critical prefetch error:", error.message);
      }
    }

    prefetchCriticalData();
    
    // Background prefetch for less critical data
    
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/movie/:id" element={<MovieDetailsPage />} />
            <Route path="/groups" element={<GroupPage />} />
            <Route path="/UserWatchlists" element={<UserWatchlistPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/UserProfile" element={<UserPage />} />
            <Route path="/FriendsPage" element={<FriendsPage />} />
            <Route path="/DiscoverPage" element={<DiscoverPage />} />
            <Route path="/ReviewedPage" element={<ReviewPage />} />
          </Routes>
        </BrowserRouter>
      </div>
    </QueryClientProvider>
  );
}

export default App;