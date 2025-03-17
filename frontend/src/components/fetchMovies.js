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
