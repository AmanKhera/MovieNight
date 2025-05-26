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
import ProtectedRoute from "./components/ProtectedRoute";
import {
  fetchUserInfo,
  fetchRecentlyWatched,
  fetchWatchlistMovies,
  fetchMovieRecommendations,
  fetchMovieDetailsByTitle,
  fetchMoviePoster,
  fetchUserGroups,
  fetchMutualFriends,
  fetchGroupMembers
} from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 1,
      gcTime: 1000 * 60 * 60 * 24,
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
        const userInfo = await queryClient.fetchQuery({
          queryKey: ['userInfo'],
          queryFn: fetchUserInfo,
          staleTime: Infinity
        });

        await Promise.all([
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
          queryClient.prefetchQuery({
            queryKey: ['userGroups', userInfo.username],
            queryFn: () => fetchUserGroups(userInfo.username),
          }).then(async () => {
            const groups = queryClient.getQueryData(['userGroups', userInfo.username]);
            if (groups?.length) {
              await Promise.all(
                groups.map(group =>
                  queryClient.prefetchQuery({
                    queryKey: ['groupMembers', group.group_id],
                    queryFn: () => fetchGroupMembers(group.group_id),
                  })
                )
              );
            }
          }),
          queryClient.prefetchQuery({
            queryKey: ['mutualFriends', userInfo.id],
            queryFn: () => fetchMutualFriends(userInfo.id),
          }),
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

        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
          const [url, options] = args;

          const isRecommend = typeof url === 'string' && url.includes('/recommend_movie/');
          const isWatchlistAdd = typeof url === 'string' && url.includes('/add_to_watchlist/');
          const isWatchedAdd = typeof url === 'string' && url.includes('/add_to_watched/');

          const response = await originalFetch(...args);

          if (response.ok) {
            const userInfo = queryClient.getQueryData(['userInfo']);

            if (isRecommend && userInfo?.id) {
              queryClient.invalidateQueries(['recommendations', userInfo.id]);
            }

            if (isWatchlistAdd) {
              queryClient.invalidateQueries(['watchlistMovies']);
            }

            if (isWatchedAdd) {
              queryClient.invalidateQueries(['recentlyWatched']);
              queryClient.invalidateQueries(['reviewedMovies', userInfo?.id]);
            }
          }

          return response;
        };

      } catch (error) {
        console.error("Prefetch error:", error);
      }
    }

    prefetchCriticalData();

    const interval = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: ['recentlyWatched'],
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: ['watchlistMovies'],
        refetchType: 'active',
      });
    }, 1000 * 60 * 5);

    return () => clearInterval(interval);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/movie/:id" element={<MovieDetailsPage />} />

            <Route path="/groups" element={
              <ProtectedRoute>
                <GroupPage />
              </ProtectedRoute>
            }
            />
            <Route path="/UserWatchlists" element={
              <ProtectedRoute>
                <UserWatchlistPage />
              </ProtectedRoute>
            }
            />
            <Route path="/search" element={
              <ProtectedRoute>
                <SearchPage />
              </ProtectedRoute>
            }
            />
            <Route path="/UserProfile" element={
              <ProtectedRoute>
                <UserPage />
              </ProtectedRoute>
            }
            />
            <Route path="/FriendsPage" element={
              <ProtectedRoute>
                <FriendsPage />
              </ProtectedRoute>
            }
            />
            <Route path="/DiscoverPage" element={<ProtectedRoute>
              <DiscoverPage />
            </ProtectedRoute>
            }
            />
            <Route path="/ReviewedPage" element={
              <ProtectedRoute>
                <ReviewPage />
              </ProtectedRoute>
            }
            />
          </Routes>
        </BrowserRouter>
      </div>
    </QueryClientProvider>
  );
}

export default App;
