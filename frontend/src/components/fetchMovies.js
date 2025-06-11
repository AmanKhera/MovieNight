/**
 * uses the given searchText to call the movie database and return the
 * search results
 * @param {String} searchText - user's search input
 * @param {Function} moviesCallback -
 * @param {Function} errorCallback -
 * @return {JSON <object>} - search results
 */
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

/**
 * uses the given id to call the movie database and return the details of
 * that specific movie
 * @param {String} id - specific movie id
 * @param {Function} errorCallback -
 * @return {JSON <object>} - search results
 */
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

/**
 * uses the given searchText that is assumed to be the name of a movie director to call two
 * endpoints and return the search results
 * @param {String} searchText - user's search input that is assumed to be the name of a movie
 *                              director (ex. Spielberg or Steven Spielberg)
 * @param {Function} moviesCallback -
 * @param {Function} errorCallback -
 * @return {JSON <object>} - search results
 */
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

/**
 * uses the given searchText that is assumed to be a certain year to call two endpoints
 * and return the search results
 * @param {String} searchText - user's search input that is assumed to be a year (ex. 2002)
 * @param {Function} moviesCallback -
 * @param {Function} errorCallback -
 * @return {JSON <object>} - search results
 */
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

/**
 * uses the given searchFilterValue that is assumed to be the content rating of a movie (G, PG, PG-13, R)
 * to call two endpoints and return the search results
 * @param {String} searchFilterValue - user's search filter that is assumed to be the content rating of a
 *                                     movie (G, PG, PG-13, R)
 * @param {Function} moviesCallback -
 * @param {Function} errorCallback -
 * @param {Number} batchSize - number of movies to be returned each call
 * @return {JSON <object>} - search results
 */
export const fetchMoviesByContentRating = async (searchFilterValue, moviesCallback, errorCallback, batchSize) => {
  try {
    const response = await fetch(`http://localhost:8000/search/?filter=rating&q=${searchFilterValue}`);
    const data = await response.json();
    if (response.ok) {

      const moviesArray = [];

      for (let i = 0; i < batchSize; i++) {
        const title = data.movies[i].title;
        const year = data.movies[i].year;
        const movie = await fetchMovieDetailsByTitleAndYear(title, year, errorCallback);
        if (movie != null && movie.Rated == data.movies[i].rating) {
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

/**
 * uses the given searchFilterValue that is assumed to be the runtime of a movie (in minutes)
 * to call two endpoints and return the search results
 * @param {String} searchFilterValue - user's search filter that is assumed to be the runtime of a
 *                                     movie in minutes (either 90, 120, or 180)
 * @param {Function} moviesCallback -
 * @param {Function} errorCallback -
 * @param {Number} batchSize - number of movies to be returned each call
 * @return {JSON <object>} - search results
 */
export const fetchMoviesByRuntime = async (searchFilterValue, moviesCallback, errorCallback, batchSize) => {
  try {
    const response = await fetch(`http://localhost:8000/search/?filter=runtime&q=${searchFilterValue}`);
    const data = await response.json();
    if (response.ok) {
      const moviesArray = [];

      for (let i = (-10 + batchSize); i < batchSize; i++) {
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

/**
 * uses the given searchFilterValue that is assumed to be the runtime of a movie (in minutes)
 * to call two endpoints and return the search results
 * @param {String} searchFilterValue - user's search filter that is assumed to be the runtime of a
 *                                     movie in minutes (either 90, 120, or 180)
 * @param {Function} moviesCallback -
 * @param {Function} errorCallback -
 * @param {Number} batchSize - number of movies to be returned each call
 * @return {JSON <object>} - search results
 */
export const fetchMoviesByGenre = async (searchFilterValue, moviesCallback, errorCallback, page) => {
  try {
    searchFilterValue = searchFilterValue.toLowerCase();
    const response = await fetch(`http://localhost:8000/discover_movie/?genre=${searchFilterValue}&page=${page}`);
    const data = await response.json();
    if (response.ok) {
      const moviesArray = [];

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
    errorCallback('An error occured while fetching movie genre data.');
  }
};

/**
 * uses the given movie title and movie year to call the movie database and return the details of
 * that specific movie
 * @param {String} title - specific movie title
 * @param {String} year - specific movie year
 * @param {Function} errorCallback -
 * @return {JSON <object>} - search results
 */
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