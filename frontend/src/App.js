import React, { useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MovieDetailsPage from './pages/MovieDetails';
import GroupPage from './pages/GroupPage';

function App() {
  // Fetch the CSRF token when the app loads
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await fetch('http://localhost:8000/get-csrf-token/', {
          credentials: 'include', // Include cookies in the request
        });
        if (!response.ok) {
          throw new Error('Failed to fetch CSRF token');
        }
        console.log('CSRF token cookie has been set.');
      } catch (error) {
        console.error('Error fetching CSRF token:', error);
      }
    };

    fetchCsrfToken();
  }, []); // Empty dependency array ensures this runs only once when the app loads

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/movie/:id" element={<MovieDetailsPage />} />
          <Route path="/groups" element={<GroupPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;