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
      return data;
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

      const movieDetails = {
        "Search": moviesArray
      };

      moviesCallback(movieDetails);
      errorCallback(null);
      return movieDetails;
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
        if (movie != null && movie.Year == year) {
          moviesArray.push(movie);
        }
      }

      const movieDetails = {
        "Search": moviesArray
      };

      moviesCallback(movieDetails);
      errorCallback(null);
      return movieDetails;
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