import React, { useState } from "react";
import '../components/SearchPage.css';
import Toolbar from '../components/Toolbar';
import { fetchMovies, fetchMovieDetails } from '../components/fetchMovies';
// import SearchResult from '../components/SearchResult';


const SearchPage = () => {

  const [searchInputText, setSearchInputText] = useState('')
  const [enteredSearchText, setEnteredSearchText] = useState('')
  const [movies, setMovies] = useState([])
  const [error, setError] = useState(null)

  const toggleFilters = () => {
    const filterOptions = document.getElementById("filter-options");
    if (filterOptions.classList.contains("hidden")) {
      filterOptions.classList.remove("hidden");
    } else {
      filterOptions.classList.add("hidden");
    }
  };

  // toggle to show/not show the given filter options
  const toggleFilterOptions = (elementID) => {
    const filterOptions = document.getElementById(`${elementID}`);
    if (filterOptions.classList.contains("hidden")) {
      filterOptions.classList.remove("hidden");
    } else {
      filterOptions.classList.add("hidden");
    }
  }

  // toggle to show/not show the given button as clicked
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

  const filterContentRatingButtonAction = () => {
    toggleFilterOptions("content-rating-filter-options");
    toggleButtonClicked("filter-content-rating-button");
  };

  const filterRuntimeButtonAction = () => {
    document.getElementById('filter-runtime-button').classList.toggle("clicked");
  };

  const filterDirectorButtonAction = () => {
    document.getElementById('filter-director-button').classList.toggle("clicked");
  };

  const filterActorButtonAction = () => {
    document.getElementById('filter-actor-button').classList.toggle("clicked");
  };

  const searchButtonAction = async () => {
    toggleButtonClicked("search-button-actual");
    setEnteredSearchText(searchInputText);
    // var searchInput = document.getElementById('search-input').value;
    let result = await fetchMovies(searchInputText, setMovies, setError)
    console.log("b: " + JSON.stringify(result));
    console.log("b: " + result.Search.length);
    await displaySearchResult(result);
  };

  const displaySearchResult = async (result) => {
    // console.log("movies: " + movies);
    // console.log(JSON.stringify(movies));
    // let v = JSON.stringify(movies);
    console.log("v :" + result.Title);
    console.log("v :" + result.Poster);
    document.getElementById("search-result").innerHTML = "";
    for (let i = 0; i < result.Search.length; i++) {
      let movie = document.createElement("li");
      movie.id = result.Search[i].imdbID;
      let poster = document.createElement("img");
      poster.src = result.Search[i].Poster;
      poster.alt = result.Search[i].Title + " movie poster";
      movie.appendChild(poster);
      let info = document.createElement("div");
      movie.appendChild(info);
      let title = document.createElement("h1");
      title.textContent = result.Search[i].Title;
      info.appendChild(title);
      let year = document.createElement("h2");
      year.textContent = result.Search[i].Year;
      info.appendChild(year);
      let director = document.createElement("h2");
      let moreInfo = await fetchMovieDetails(movie.id, error);
      director.textContent = "Directed by: " + moreInfo.Director;
      info.appendChild(director);
      document.getElementById("search-result").appendChild(movie);
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
              <button id="genre-filter-comedy-button">Comedy</button>
              <button id="genre-filter-horror-button">Horror</button>
              <button id="genre-filter-action-button">Action</button>
          </div>
          {/* {enteredSearchText} */}
          {error}
          <div id="content-rating-filter-options" class="hidden">
              <button id="g-rated-button">G</button>
              <button id="pg-rated-button">PG</button>
              <button id="pg13-rated-button">PG-13</button>
              <button id="r-rated-button">R</button>
          </div>
          <div>
            <ul id="search-result" style={{ listStyle: 'none' }}></ul>
          </div>
        </div>
      </section>
      {/* {error && <ErrorAlert error={error} searchTerm={enteredSearchText}/>} */}
      {/* {movies.length > 0 && <p style="color:white;">Showing {movies.length} Movies for '{enteredSearchText}'</p>} */}
      {/* {enteredSearchText} */}
      {/* {JSON.stringify(movies)} */}
      {/* {error} */}
      {/* <SearchResult /> */}
    </div>
  );
};

export default SearchPage;