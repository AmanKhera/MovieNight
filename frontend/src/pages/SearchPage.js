import React, { useState } from "react";
import '../components/SearchPage.css';
import Toolbar from '../components/Toolbar';
import { fetchMovies, fetchMovieDetails } from '../components/fetchMovies';
import { fetchUser } from '../components/fetchUser';
import profileImage from '../images/profile-btn.png';
import { useNavigate } from "react-router-dom";

const SearchPage = () => {

  const [searchInputText, setSearchInputText] = useState('')
  const [enteredSearchText, setEnteredSearchText] = useState('')
  const [movies, setMovies] = useState([])
  const [users, setUsers] = useState([])
  const [error, setError] = useState(null)

  const navigate = useNavigate();

  /**
   * toggle to display/hide the filters
   */
  const toggleFilters = () => {
    const filterOptions = document.getElementById("filter-options");
    if (filterOptions.classList.contains("hidden")) {
      filterOptions.classList.remove("hidden");
    } else {
      filterOptions.classList.add("hidden");
    }
  };

  /**
   * toggle to display/hide the given filter's options
   * @param {String} elementID - id of a specific filter
   */
  const toggleFilterOptions = (elementID) => {
    const filterOptions = document.getElementById(`${elementID}`);
    if (filterOptions.classList.contains("hidden")) {
      filterOptions.classList.remove("hidden");
    } else {
      filterOptions.classList.add("hidden");
    }
  }

  /**
   * toggle to display the given button as clicked or not
   * @param {String} buttonID - id of a specific button
   */
  const toggleButtonClicked = (buttonID) => {
    const buttonClicked = document.getElementById(`${buttonID}`);
    if (buttonClicked.classList.contains("clicked")) {
      buttonClicked.classList.remove("clicked");
    } else {
      buttonClicked.classList.add("clicked");
    }
  }

  const filterGenreButtonAction = () => {
    toggleFilterOptions("genre-filter-options");
    toggleButtonClicked("filter-genre-button");
  };


  // -------------Attempt with Genre------------------------
  // const fetchMoviesByGenre = async () => {
  //   try {
  //     const response = await fetch("http://localhost:8000/search", {
  //       credentials: "include",
  //     });
  //     if (!response.ok) {
  //       throw new Error("Failed to fetch movies by genre");
  //     }
  //     const data = await response.json();
  //     console.log("discover_movies response:", data);
  //     if (data.error) {
  //       setError(data.error);
  //     } else {
  //       // setLeaderId(data.id);
  //       console.log("in else");
  //     }
  //   } catch (err) {
  //     setError(err.message);
  //   }
  // };

  const genreFilterButtonAction = (clicked) => {
    toggleButtonClicked(clicked.target.id);
    const buttonClicked = document.getElementById(`${clicked.target.id}`);
    if (buttonClicked.classList.contains("clicked")) {
      console.log(clicked.target.id);
      let tokens = (clicked.target.id).split("-");
      let genre = tokens[2];
      console.log("genre: " + genre);
      // fetchMoviesByGenre();
    }
  };

  const filterContentRatingButtonAction = () => {
    toggleFilterOptions("content-rating-filter-options");
    toggleButtonClicked("filter-content-rating-button");
  };

  const contentRatingFilterButtonAction = (clicked) => {
    toggleButtonClicked(clicked.target.id);
    const buttonClicked = document.getElementById(`${clicked.target.id}`);
    if (buttonClicked.classList.contains("clicked")) {
      console.log(clicked.target.id);
      let tokens = (clicked.target.id).split("-");
      let contentRating = tokens[0];
      console.log("content rating: " + contentRating);
      // fetchMoviesByContentRating();
    }
  };

  const filterRuntimeButtonAction = () => {
    toggleFilterOptions("runtime-filter-options");
    toggleButtonClicked("filter-runtime-button");
  };

  const filterDirectorButtonAction = () => {
    document.getElementById('filter-director-button').classList.toggle("clicked");
  };

  const filterActorButtonAction = () => {
    document.getElementById('filter-actor-button').classList.toggle("clicked");
  };

  /**
   * execute user's search for users/movies
   */
  const searchButtonAction = async () => {
    toggleButtonClicked("search-button-actual");
    setEnteredSearchText(searchInputText);

    let userResult = await fetchUser(searchInputText, setUsers, setError);
    if (userResult.length == 0) {
      document.getElementById("search-result-user").innerHTML = "No users found by that search term";
    } else {
      await displayUserSearchResult(userResult);
    }

    let movieResult = await fetchMovies(searchInputText, setMovies, setError)
    if (!movieResult) {
      document.getElementById("search-result-movie").innerHTML = "No movies found by that search term";
    } else {
      await displayMovieSearchResult(movieResult);
    }
  };

  /**
   * takes in the given user data and displays it in the search results
   * @param {JSON <object>} result - user data resulting from the search
   */
  const displayUserSearchResult = async (result) => {
    document.getElementById("search-result-user").innerHTML = "";
    for (let i = 0; i < result.length; i++) {
      let user = document.createElement("li");
      user.id = result[i].name;
      let userIcon = document.createElement("img");
      userIcon.src = profileImage;
      userIcon.alt = "user icon image";
      user.appendChild(userIcon);
      let info = document.createElement("div");
      user.appendChild(info);
      let name = document.createElement("h1");
      name.textContent = result[i].name;
      info.appendChild(name);
      let username = document.createElement("h2");
      if (result[i].username) {
        username.textContent = "@" + result[i].username;
      }
      info.appendChild(username);
      document.getElementById("search-result-user").appendChild(user);
    }
  };

  /**
   * takes in the given movie data and displays it in the search results
   * @param {JSON <object>} result - movie data resulting from the search
   */
  const displayMovieSearchResult = async (result) => {
    document.getElementById("search-result-movie").innerHTML = "";
    if (result.length == 0) {
      document.getElementById("search-result-user").innerHTML = "No movies found by that search term";
    }
    for (let i = 0; i < result.Search.length; i++) {
      let movie = document.createElement("li");
      movie.id = result.Search[i].imdbID;
      let poster = document.createElement("img");
      poster.src = result.Search[i].Poster;
      poster.alt = result.Search[i].Title + " movie poster";
      poster.onclick = () => handleMovieClick(result.Search[i].Title);
      movie.appendChild(poster);
      let info = document.createElement("div");
      movie.appendChild(info);
      let title = document.createElement("h1");
      title.textContent = result.Search[i].Title;
      title.onclick = () => handleMovieClick(result.Search[i].Title);
      info.appendChild(title);
      let year = document.createElement("h2");
      year.textContent = result.Search[i].Year;
      info.appendChild(year);
      let director = document.createElement("h2");
      let moreInfo = await fetchMovieDetails(movie.id, error);
      director.textContent = "Directed by: " + moreInfo.Director;
      info.appendChild(director);
      document.getElementById("search-result-movie").appendChild(movie);
    }
  };

  /**
   * takes in the given movie title and redirects the user to that movie's
   * movie details page
   * @param {String} movie - movie title
   */
  const handleMovieClick = (movie) => {
    const titleParam = encodeURIComponent(movie);
    const releaseDate = movie.release_date; // TMDb usually provides release_date

    // We pass the movie title (and release date, if available) in the URL.
    if (releaseDate) {
      navigate(`/movie/${titleParam}?release_date=${encodeURIComponent(releaseDate)}`);
    } else {
      navigate(`/movie/${titleParam}`);
    }
  };

  const ErrorAlert = (error, searchTerm) => {
    return (
      <div style="background-color:red; color:white">
        <strong>Oh no!</strong> '{searchTerm}' resulted in '{error}' error
      </div>
    )
  }

  return (
    <div>
      <Toolbar />
      <section>
        <div class="search-container">
            <input
              type="text" id="search-input" placeholder="Type your search here..."
              value={searchInputText}
              onChange={(e) => setSearchInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  searchButtonAction();
              }}
            />
          <button id="search-button-actual" onClick={searchButtonAction}>Search</button>
          <button id="toggle-filters-button" onClick={toggleFilters}>+</button>
          <div id="filter-options" class="hidden">
            <button id="filter-genre-button" onClick={filterGenreButtonAction}>Genre</button>
            <button id="filter-content-rating-button" onClick={filterContentRatingButtonAction}>Content Rating</button>
            <button id="filter-runtime-button" onClick={filterRuntimeButtonAction}>Runtime</button>
            <button id="filter-director-button" onClick={filterDirectorButtonAction}>Director</button>
            <button id="filter-actor-button" onClick={filterActorButtonAction}>Actor</button>
          </div>
          <div id="genre-filter-options" class="hidden">
          <button id="genre-filter-action-button" onClick={genreFilterButtonAction}>Action</button>
            <button id="genre-filter-adventure-button" onClick={genreFilterButtonAction}>Adventure</button>
            <button id="genre-filter-animation-button" onClick={genreFilterButtonAction}>Animation</button>
            <button id="genre-filter-comedy-button" onClick={genreFilterButtonAction}>Comedy</button>
            <button id="genre-filter-crime-button" onClick={genreFilterButtonAction}>Crime</button>
            <button id="genre-filter-documentary-button" onClick={genreFilterButtonAction}>Documentary</button>
            <button id="genre-filter-drama-button" onClick={genreFilterButtonAction}>Drama</button>
            <button id="genre-filter-family-button" onClick={genreFilterButtonAction}>Family</button>
            <button id="genre-filter-history-button" onClick={genreFilterButtonAction}>History</button>
            <button id="genre-filter-horror-button" onClick={genreFilterButtonAction}>Horror</button>
            <button id="genre-filter-mystery-button" onClick={genreFilterButtonAction}>Mystery</button>
            <button id="genre-filter-romance-button" onClick={genreFilterButtonAction}>Romance</button>
            <button id="genre-filter-science-fiction-button" onClick={genreFilterButtonAction}>Science Fiction</button>
            <button id="genre-filter-war-button" onClick={genreFilterButtonAction}>War</button>
            <button id="genre-filter-thriller-button" onClick={genreFilterButtonAction}>Thriller</button>
          </div>
          <div id="content-rating-filter-options" class="hidden">
            <button id="g-rated-button" onClick={contentRatingFilterButtonAction}>G</button>
            <button id="pg-rated-button" onClick={contentRatingFilterButtonAction}>PG</button>
            <button id="pg13-rated-button" onClick={contentRatingFilterButtonAction}>PG-13</button>
            <button id="r-rated-button" onClick={contentRatingFilterButtonAction}>R</button>
          </div>
          <div id="runtime-filter-options" class="hidden">
            <button id="90-min-button" onClick={contentRatingFilterButtonAction}>90 Min</button>
            <button id="120-min-button" onClick={contentRatingFilterButtonAction}>120 Min</button>
            <button id="180-min-button" onClick={contentRatingFilterButtonAction}>180 Min</button>
          </div>
          {ErrorAlert}
          <div>
            <ul id="search-result-user" style={{ listStyle: 'none' }}></ul>
          </div>
          <div>
            <ul id="search-result-movie" style={{ listStyle: 'none' }}></ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SearchPage;