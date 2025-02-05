import './App.css';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from './pages/HomePage';
import MovieDetailsPage from './pages/MovieDetails';
import GroupPage from './pages/GroupPage';


function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/movie/:id" element={<MovieDetailsPage />} />
          <Route path="/groups" element={<GroupPage/>} />
        </Routes>
    </BrowserRouter>
    </div>
  );
}

export default App;
