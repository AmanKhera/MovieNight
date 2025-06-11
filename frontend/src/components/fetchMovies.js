export const fetchMovies = async (searchText, moviesCallback, errorCallback) => {
  try {
    const response = await fetch(`http://www.omdbapi.com/?s=${searchText}&apikey=3d39d278&type=movie`);
    const data = await response.json();

    if (data.Response === 'True') {
      const movieDetailsPromises = data.Search.map((movie) => fetchMovieDetails(movie.imdbID, errorCallback));
      const movieDetails = await Promise.all(movieDetailsPromises);

      moviesCallback(movieDetails);
      errorCallback(null);
      return movieDetails;
    } else {
      moviesCallback([]);
      errorCallback(data.Error);
    }
  } catch (err) {
    moviesCallback([]);
    errorCallback('An error occured while fetching movie data.');
  }
};


export const fetchMovieDetails = async (id, errorCallback) => {
  try {
    const response = await fetch(`http://www.omdbapi.com/?i=${id}&plot=full&apikey=3d39d278`);
    const data = await response.json();
    if (data.Response === 'True') {
      return data;
    } else {
      throw new Error(data.Error);
    }
  } catch (err) {
    errorCallback('An error occured while fetching movie details.');
  }
}


export const fetchMoviesByDirector = async (searchText, moviesCallback, errorCallback) => {
  try {
    const response = await fetch(`http://localhost:8000/search/?filter=director&q=${searchText}`);
    const data = await response.json();
    if (response.ok) {
      const moviesArray = [];

      for (let i = 0; i < data.directors.length; i++) {
        const title = data.directors[i].title;
        const year = data.directors[i].year;
        const movie = await fetchMovieDetailsByTitleAndYear(title, year, errorCallback);
        if (movie != null && movie.Director === data.directors[i].director) {
          moviesArray.push(movie);
        }
      }

      moviesCallback(moviesArray);
      errorCallback(null);
      return moviesArray;
    } else {
      moviesCallback([]);
      errorCallback(data.Error);
    }
  } catch (error) {
    moviesCallback([]);
    errorCallback('An error occured while fetching movie director data.');
  }
};

export const fetchMoviesByYear = async (searchText, moviesCallback, errorCallback) => {
  try {
    const response = await fetch(`http://localhost:8000/search/?year=${searchText}&q=movie`);
    const data = await response.json();
    if (response.ok) {
      const moviesArray = [];

      for (let i = 0; i < data.movies.length; i++) {
        const title = data.movies[i].title;
        const year = data.movies[i].year;
        const movie = await fetchMovieDetailsByTitleAndYear(title, year, errorCallback);
        if (movie != null && movie.Year == data.movies[i].year) { //needs to be == not === in order to work
          moviesArray.push(movie);
        }
      }

      moviesCallback(moviesArray);
      errorCallback(null);
      return moviesArray;
    } else {
      moviesCallback([]);
      errorCallback(data.Error);
    }
  } catch (error) {
    moviesCallback([]);
    errorCallback('An error occured while fetching movie director data.');
  }
};


export const fetchMoviesByContentRating = async (searchFilterValue, moviesCallback, errorCallback, batchSize) => {
  try {
    const response = await fetch(`http://localhost:8000/search/?filter=rating&q=${searchFilterValue}`);
    const data = await response.json();
    if (response.ok) {

      const moviesArray = [];

      for (let i = (-10 + batchSize); i < batchSize; i++) {
        const title = data.movies[i].title;
        const year = data.movies[i].year;
        const movie = await fetchMovieDetailsByTitleAndYear(title, year, errorCallback);
        if (movie != null && movie.Rated === data.movies[i].rating) {
          moviesArray.push(movie);
        }
      }

      moviesCallback(moviesArray);
      errorCallback(null);
      return moviesArray;
    } else {
      moviesCallback([]);
      errorCallback(data.Error);
    }
  } catch (error) {
    moviesCallback([]);
    errorCallback('An error occured while fetching movie content rating data.');
  }
};


export const fetchMoviesByRuntime = async (searchFilterValue, moviesCallback, errorCallback, batchSize) => {
  try {
    const response = await fetch(`http://localhost:8000/search/?filter=runtime&q=${searchFilterValue}`);
    const data = await response.json();
    if (response.ok) {
      const moviesArray = [];

      for (let i = (batchSize - 10); i < batchSize; i++) {
        const title = data.movies[i].title;
        const year = data.movies[i].year;
        const movie = await fetchMovieDetailsByTitleAndYear(title, year, errorCallback);
        if (movie != null && movie.Title === title) {
          moviesArray.push(movie);
        }
      }

      moviesCallback(moviesArray);
      errorCallback(null);
      return moviesArray;
    } else {
      moviesCallback([]);
      errorCallback(data.Error);
    }
  } catch (error) {
    moviesCallback([]);
    errorCallback('An error occured while fetching movie runtime data.');
  }
};


export const fetchMoviesByGenre = async (searchFilterValue, moviesCallback, errorCallback, page) => {
  try {
    const response = await fetch(`http://localhost:8000/discover_movie/?genre=${searchFilterValue}&page=${page}`);
    const data = await response.json();
    if (response.ok) {
      const moviesArray = [];

      console.log("genre data==>>" + JSON.stringify(data));

      for (let i = 0; i < data.results.length; i++) {
        const title = data.results[i].original_title;
        const date = data.results[i].release_date;
        const year = date.slice(0, 4);
        const movie = await fetchMovieDetailsByTitleAndYear(title, year, errorCallback);
        if (movie != null && movie.Title === title) {
          moviesArray.push(movie);
        }
      }

      moviesCallback(moviesArray);
      errorCallback(null);
      return moviesArray;
    } else {
      moviesCallback([]);
      errorCallback(data.Error);
    }
  } catch (error) {
    moviesCallback([]);
    errorCallback('An error occured while fetching movie runtime data.');
  }
};


export const fetchMovieDetailsByTitleAndYear = async (title, year, errorCallback) => {
  try {
    const response = await fetch(`http://www.omdbapi.com/?t=${title}&y=${year}&apikey=3d39d278`);
    const data = await response.json();

    if (data.Response === 'True') {
      return data;
    } else {
      throw new Error(data.Error);
    }
  } catch (err) {
    errorCallback('An error occured while fetching movie details by title and year.');
  }
}