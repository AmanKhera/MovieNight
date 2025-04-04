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
import { fetchRecentlyWatched, fetchWatchlistMovies } from './api';
import FriendsPage from './pages/FriendsPage';
import RecommendationMoviePage from './pages/RecommendMoviePage';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Set up local storage persister for React Query
const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
});

persistQueryClient({
  queryClient,
  persister: localStoragePersister,
});

function App() {
  useEffect(() => {
    async function prefetchData() {
      try {
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: ['recentlyWatched'],
            queryFn: fetchRecentlyWatched,
          }),
          queryClient.prefetchQuery({
            queryKey: ['watchlistMovies'],
            queryFn: fetchWatchlistMovies,
          })
        ]);
        console.log("Successfully prefetched all data");
      } catch (error) {
        console.error("Prefetch error:", error.message);
      }
    }

    prefetchData();
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
            <Route path='RecommendationMoviePage' element={<RecommendationMoviePage/>}/>
          </Routes>
        </BrowserRouter>
      </div>
    </QueryClientProvider>
  );
}

export default App;
