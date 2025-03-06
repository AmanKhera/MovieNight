// import React, { useState, useEffect } from "react";
// import { useParams } from "react-router-dom";
// import "../pages/SearchResult.css";

export const fetchMovies = async (searchText, moviesCallback, errorCallback) => {
  try {
    const response = await fetch(`http://www.omdbapi.com/?s=${searchText}&apikey=3d39d278&type=movie`);
    const data = await response.json();

    if (data.Response === 'True') {
      const movieDetailsPromises = data.Search.map((movie) => fetchMovieDetails(movie.imdbID, errorCallback));
      const movieDetails = await Promise.all(movieDetailsPromises);

      console.log("HERE: " + data.Search);
      moviesCallback(movieDetails);
      errorCallback(null);
      return data;
    } else {
      moviesCallback([]);
      errorCallback(data.Error);
    }
  } catch (err) {
    moviesCallback([]);
    errorCallback('An error occured while fetching data.');
  }
};

// export const fetchMovies = async (searchText, moviesCallback, errorCallback) => {
//   try {
//     const response = await fetch(`http://localhost:8000/api_search/?q=${searchText}`);
//     const data = await response.json();

//     if (data.Response === 'True') {
//       const movieDetailsPromises = data.map((movie) => fetchMovieDetails(movie.imdbID, errorCallback));
//       const movieDetails = await Promise.all(movieDetailsPromises);

//       console.log("HERE: " + data);
//       moviesCallback(data);
//       errorCallback(null);
//       return data;
//     } else {
//       moviesCallback([]);
//       errorCallback(data.Error);
//     }
//   } catch (err) {
//     moviesCallback([]);
//     errorCallback('An error occured while fetching data.');
//   }
// };

export const fetchMovieDetails = async (id, errorCallback) => {
  try {
    const response = await fetch(`http://www.omdbapi.com/?i=${id}&plot=full&apikey=3d39d278`);
    const data = await response.json();

    if (data.Response === 'True') {
      console.log("HEREeeeeeeeeeee: " + JSON.stringify(data));
      return data;
    } else {
      throw new Error(data.Error);
    }
  } catch (err) {
    errorCallback('An error occured while fetching movie details.');
  }
}

// const fetchMovieDetails = async (id, errorCallback) => {
//   try {
//     const response = await fetch(`http://localhost:8000/api_search/?q=${id}`);
//     const data = await response.json();

//     if (data.Response === 'True') {
//       return data;
//     } else {
//       throw new Error(data.Error);
//     }
//   } catch (err) {
//     errorCallback('An error occured while fetching movie details.');
//   }
// }

// export const fetchGenre = async (searchText, moviesCallback, errorCallback) => {
//   try {
//     const response = await fetch(`http://www.omdbapi.com/?s=${searchText}&apikey=3d39d278&type=movie`);
//     const data = await response.json();

//     if (data.Response === 'True') {
//       const movieDetailsPromises = data.Search.map((movie) => fetchMovieDetails(movie.imdbID, errorCallback));
//       const movieDetails = await Promise.all(movieDetailsPromises);

//       console.log("HERE: " + data.Search);
//       moviesCallback(movieDetails);
//       errorCallback(null);
//       return data;
//     } else {
//       moviesCallback([]);
//       errorCallback(data.Error);
//     }
//   } catch (err) {
//     moviesCallback([]);
//     errorCallback('An error occured while fetching data.');
//   }
// };

// export default fetchMovies;


// const SearchResults = () => {
//   return (
//     <div>
//       <section>
//         <h1>Movie Search Results</h1>
//           <div class="grid-container">
//             <a href="movie1.html" class="movie-item">
//                 <img src="poster1.jpg" alt="Movie 1"/>
//             </a>
//             <a href="movie2.html" class="movie-item">
//                 <img src="poster2.jpg" alt="Movie 2"/>
//             </a>
//             <a href="movie3.html" class="movie-item">
//                 <img src="poster3.jpg" alt="Movie 3"/>
//             </a>
//             {/* <!-- Add more movie items dynamically --> */}
//           </div>
//         </section>
//     </div>
//   );
// };

// export default SearchResults;