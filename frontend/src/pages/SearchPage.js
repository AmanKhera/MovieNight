import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import '../components/SearchPage.css';
import Toolbar from '../components/Toolbar';
import { fetchMovies, fetchMoviesByDirector, fetchMoviesByYear, fetchMoviesByContentRating, fetchMoviesByRuntime, fetchMoviesByGenre } from '../components/fetchMovies';
import { fetchUser } from '../components/fetchUser';
import profileImage from '../images/profile-btn.png';
import defaultPoster from '../images/default-poster.jpg';
import { SpinnerCircular } from 'spinners-react';

const SearchPage = () => {

  const [searchInputText, setSearchInputText] = useState('')
  const [enteredSearchText, setEnteredSearchText] = useState('')
  const [movies, setMovies] = useState([])
  const [users, setUsers] = useState([])
  const [error, setError] = useState(null)

  const navigate = useNavigate();
  const location = useLocation();

  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filter = params.get('filter');
    const q = params.get('q');
    if (filter === 'director') {
      const directorButton = document.getElementById('filter-director-button');
      if (directorButton && !directorButton.classList.contains('clicked')) {
        directorButton.classList.add('clicked');
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          searchInput.placeholder = "Type a director's name here...";
        }
      }
    }
    if (filter === 'year') {
      const yearButton = document.getElementById('filter-year-button');
      if (yearButton && !yearButton.classList.contains('clicked')) {
        yearButton.classList.add('clicked');
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          searchInput.placeholder = "Type the year here...";
        }
      }
    }
    if (q) {
      setSearchInputText(q);
      setTimeout(() => {
        searchButtonAction(q);
      }, 0);
    }
  }, [location.search]);

  useEffect(() => {
    const fetchCurrentUserId = async () => {
      try {
        const res = await fetch("http://localhost:8000/user_info/", {
          credentials: 'include'
        });
        const data = await res.json();
        if (data.id) {
          setCurrentUserId(data.id);
          console.log("Current user ID:", data.id);
        } else {
          console.warn("No user ID found in response.");
        }
      } catch (error) {
        console.error("Failed to fetch current user ID:", error);
      }
    };

    fetchCurrentUserId();
  }, []);

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

  /**
   * toggle to display the 'Genre' button as clicked or not and display/hide the genre filter
   * options (when the 'Genre' button is unclicked, all of the genre buttons are unclicked too)
   */
  const filterGenreButtonAction = () => {
    toggleFilterOptions("genre-filter-options");
    toggleButtonClicked("filter-genre-button");
    if (!document.getElementById("filter-genre-button").classList.contains("clicked")) {
      document.getElementById("genre-filter-action-button").classList.remove("clicked");
      document.getElementById("genre-filter-adventure-button").classList.remove("clicked");
      document.getElementById("genre-filter-animation-button").classList.remove("clicked");
      document.getElementById("genre-filter-comedy-button").classList.remove("clicked");
      document.getElementById("genre-filter-crime-button").classList.remove("clicked");
      document.getElementById("genre-filter-documentary-button").classList.remove("clicked");
      document.getElementById("genre-filter-drama-button").classList.remove("clicked");
      document.getElementById("genre-filter-family-button").classList.remove("clicked");
      document.getElementById("genre-filter-fantasy-button").classList.remove("clicked");
      document.getElementById("genre-filter-history-button").classList.remove("clicked");
      document.getElementById("genre-filter-horror-button").classList.remove("clicked");
      document.getElementById("genre-filter-mystery-button").classList.remove("clicked");
      document.getElementById("genre-filter-romance-button").classList.remove("clicked");
      document.getElementById("genre-filter-science-fiction-button").classList.remove("clicked");
      document.getElementById("genre-filter-thriller-button").classList.remove("clicked");
      document.getElementById("genre-filter-war-button").classList.remove("clicked");
    }
  };

  const genreFilterButtonAction = (clicked) => {
    toggleButtonClicked(clicked.target.id);
  };

  /**
   * toggle to display the 'Content Rating' button as clicked or not and display/hide the content
   * rating filter options (when the 'Content Rating' button is unclicked, all of the content rating
   * buttons are unclicked too)
   */
  const filterContentRatingButtonAction = () => {
    toggleFilterOptions("content-rating-filter-options");
    toggleButtonClicked("filter-content-rating-button");
    if (!document.getElementById("filter-content-rating-button").classList.contains("clicked")) {
      document.getElementById("g-rated-button").classList.remove("clicked");
      document.getElementById("pg-rated-button").classList.remove("clicked");
      document.getElementById("pg13-rated-button").classList.remove("clicked");
      document.getElementById("r-rated-button").classList.remove("clicked");
    }
  };

  const contentRatingFilterButtonAction = (clicked) => {
    toggleButtonClicked(clicked.target.id);
  };

  /**
   * toggle to display the 'Runtime' button as clicked or not and display/hide the runtime filter
   * options (when the 'Runtime' button is unclicked, all of the runtime buttons are unclicked too)
   */
  const filterRuntimeButtonAction = () => {
    toggleFilterOptions("runtime-filter-options");
    toggleButtonClicked("filter-runtime-button");
    if (!document.getElementById("filter-runtime-button").classList.contains("clicked")) {
      document.getElementById("90-min-button").classList.remove("clicked");
      document.getElementById("120-min-button").classList.remove("clicked");
      document.getElementById("180-min-button").classList.remove("clicked");
    }
  };

  const runtimeFilterButtonAction = (clicked) => {
    toggleButtonClicked(clicked.target.id);
  };

  /**
   * toggle to display the 'Director' button as clicked or not and display/hide the search
   * instructions for searching by director
   */
  const filterDirectorButtonAction = () => {
    toggleButtonClicked("filter-director-button");
    if (document.getElementById('filter-director-button').classList.contains("clicked")) {
      document.getElementById('search-input').placeholder = "Type a director's name here...";
    } else {
      document.getElementById('search-input').placeholder = "Type your search here...";
    }
  };

  /**
   * toggle to display the 'Year' button as clicked or not and display/hide the search
   * instructions for searching by year
   */
  const filterYearButtonAction = () => {
    toggleButtonClicked("filter-year-button");
    if (document.getElementById('filter-year-button').classList.contains("clicked")) {
      document.getElementById('search-input').placeholder = "Type the year here...";
    } else {
      document.getElementById('search-input').placeholder = "Type your search here...";
    }
  };

  /**
   * execute the user's search request
   */
  const searchButtonAction = async () => {

    let query;
    // JSON representation of the user's filtered search query based on what button they clicked
    if (document.getElementById("filter-content-rating-button").classList.contains("clicked") ||
        document.getElementById("filter-runtime-button").classList.contains("clicked") ||
        document.getElementById("filter-genre-button").classList.contains("clicked")) {
      query = {
        Rated: {
          G: (document.getElementById("g-rated-button").classList.contains("clicked")),
          PG: (document.getElementById("pg-rated-button").classList.contains("clicked")),
          PG13: (document.getElementById("pg13-rated-button").classList.contains("clicked")),
          R: (document.getElementById("r-rated-button").classList.contains("clicked"))
        },
        Runtime: {
          Ninety: (document.getElementById("90-min-button").classList.contains("clicked")),
          OneTwenty: (document.getElementById("120-min-button").classList.contains("clicked")),
          OneEighty: (document.getElementById("180-min-button").classList.contains("clicked"))
        },
        Genre: {
          Action: (document.getElementById("genre-filter-action-button").classList.contains("clicked")),
          Adventure: (document.getElementById("genre-filter-adventure-button").classList.contains("clicked")),
          Animation: (document.getElementById("genre-filter-animation-button").classList.contains("clicked")),
          Comedy: (document.getElementById("genre-filter-comedy-button").classList.contains("clicked")),
          Crime: (document.getElementById("genre-filter-crime-button").classList.contains("clicked")),
          Documentary: (document.getElementById("genre-filter-documentary-button").classList.contains("clicked")),
          Drama: (document.getElementById("genre-filter-drama-button").classList.contains("clicked")),
          Family: (document.getElementById("genre-filter-family-button").classList.contains("clicked")),
          Fantasy: (document.getElementById("genre-filter-fantasy-button").classList.contains("clicked")),
          History: (document.getElementById("genre-filter-history-button").classList.contains("clicked")),
          Horror: (document.getElementById("genre-filter-horror-button").classList.contains("clicked")),
          Mystery: (document.getElementById("genre-filter-mystery-button").classList.contains("clicked")),
          Romance: (document.getElementById("genre-filter-romance-button").classList.contains("clicked")),
          ScienceFiction: (document.getElementById("genre-filter-science-fiction-button").classList.contains("clicked")),
          Thriller: (document.getElementById("genre-filter-thriller-button").classList.contains("clicked")),
          War: (document.getElementById("genre-filter-war-button").classList.contains("clicked"))
        }
      };
    }

    // finalize search page apperance after user hits the search button
    const finalQuery = searchInputText;
    toggleButtonClicked("search-button-actual");
    setEnteredSearchText(finalQuery);
    document.getElementById("no-search-error").classList.add("hidden");
    document.getElementById("spinner").classList.remove("hidden");
    document.getElementById("search-result-user").innerHTML = "";
    document.getElementById("search-result-movie").innerHTML = "";

    // check that a search was actually made
    if (finalQuery === "" && !query) {
      document.getElementById("spinner").classList.add("hidden");
      document.getElementById("no-search-error").classList.remove("hidden");
      return;
    }

    // handle filtered search or search by director or search by movie release year or search by
    // search bar input text
    if (query) {
      await handleFilteredSearch(query);
    } else if (document.getElementById('filter-director-button').classList.contains("clicked")) {
      let directorResult = await fetchMoviesByDirector(finalQuery, setMovies, setError);
      await displayMovieSearchResult(directorResult);
    } else if (document.getElementById('filter-year-button').classList.contains("clicked")) {
      let yearResult = await fetchMoviesByYear(finalQuery, setMovies, setError);
      await displayMovieSearchResult(yearResult);
    } else {
      let userResult = await fetchUser(finalQuery, setUsers, setError);
      if (userResult.length === 0) {
        document.getElementById("search-result-user").innerHTML = "No users found by that search term";
      } else {
        await displayUserSearchResult(userResult);
      }

      let movieResult = await fetchMovies(finalQuery, setMovies, setError)
      if (!movieResult) {
        document.getElementById("search-result-movie").innerHTML = "No movies found by that search term";
      } else {
        await displayMovieSearchResult(movieResult);
      }
    }
  };

  /**
   * execute the user's filtered search request
   * @param {JSON <object>} query - JSON of the filter buttons that the user clicked in their search
   */
  const handleFilteredSearch = async (query) => {
    // create empty movie set
    let movieSet = new Set();

    // add movies to movieSet based on any genre filters
    movieSet = await filterByGenre(query, movieSet);

    // add movies to movieSet based on any content rating filters
    if (movieSet.size == 0) {
      movieSet = await filterByContentRating(query, movieSet);
    } else {
      movieSet = crossFilterByContentRating(query, movieSet);
    }

    // add movies to movieSet based on any runtime filters
    if (movieSet.size == 0) {
      movieSet = await filterByRuntime(query, movieSet);
    } else {
      movieSet = crossFilterByRuntime(query, movieSet);
    }

    // mix up results so cross filter results are not in chunks
    // (ex. instead of all rated G results and then all rated PG results, they are mixed)
    let movieArray = [...movieSet].sort(() => Math.random() - 0.5);

    // get rid of any duplicates
    let duplicates = [];

    for (let i = 0; i < movieArray.length - 1; i++) {
      for (let j = i + 1; j < movieArray.length; j++) {
        if (movieArray[i].imdbID == movieArray[j].imdbID) {
          duplicates.push(i);
        }
      }
    }

    for (let i = 0; i < duplicates.length; i++) {
      delete movieArray[duplicates[i]];
    }

    let uniqueMovieArray = [];
    for (let i = 0; i < movieArray.length; i++) {
      if (movieArray[i]) {
        uniqueMovieArray.push(movieArray[i]);
      }
    }

    console.log(uniqueMovieArray);

    // if the search fails, remove the loading spinner display and send an error message, otherwise
    // display the results
    if (uniqueMovieArray.length == 0) {
      document.getElementById("spinner").classList.add("hidden");
      document.getElementById("search-result-movie").innerHTML = "No movies found by those search filters";
    } else {
    await displayMovieSearchResult(uniqueMovieArray);
    }
  };

  /**
   * check if the user clicked any genre filter buttons and if so, add movies of that genre to
   * the movieSet and return it
   * @param {JSON <object>} query - JSON of the filter buttons that the user clicked in their search
   * @param {Set} movieSet - set of movies from the user's search result
   * @return {Set} - set of movies from the user's search result based on the genre filters
   */
  const filterByGenre = async (query, movieSet) => {
    let genreFilters = {filters: []};

    for (const genre in query.Genre) {
      const genreIsClicked = query.Genre[genre];
      if (genreIsClicked) {
        for (let i = 1; i < 6; i++) {
          let genreFetchResult = await fetchMoviesByGenre(`${genre}`, setMovies, setError, i);
          let genreQuery = {};
          genreQuery[genre] = genreFetchResult;
          genreFilters.filters.push(genreQuery);
        }
      }
    }

    genreFilters.filters.forEach(filter => {
      for (const genreKey in filter) {
        const movies = filter[genreKey];
        movies.forEach(movie => {
          movieSet.add(movie);
        });
      }
    });
    return movieSet;
  };

  /**
   * based on the given movieSet, check if the user clicked any content rating filter buttons and
   * if so, return only the movies in the set that have the desired content rating
   * @param {JSON <object>} query - JSON of the filter buttons that the user clicked in their search
   * @param {Set} movieSet - set of movies from the user's search result
   * @return {Set} - set of movies from the user's search result based on the content rating filters
   */
  const crossFilterByContentRating = (query, movieSet) => {
    let moviesToKeep = new Set();
    for (const rating in query.Rated) {
      const contentRatingIsClicked = query.Rated[rating];
      if (contentRatingIsClicked) {
        let rated = rating;
        if (rated == "PG13") {
          rated = "PG-13";
        }
        // keep movies from movieSet with desired content ratings
        movieSet.forEach(movie => {
          if (rated == movie.Rated) {
            moviesToKeep.add(movie);
          }
        });
      }
    }
    if (moviesToKeep.size == 0) {
      return movieSet;
    }
    return moviesToKeep;
  };

  /**
   * check if the user clicked any content rating filter buttons and if so, add movies of that
   * content rating to the movieSet and return it
   * @param {JSON <object>} query - JSON of the filter buttons that the user clicked in their search
   * @param {Set} movieSet - set of movies from the user's search result
   * @return {Set} - set of movies from the user's search result based on the content rating filters
   */
  const filterByContentRating = async (query, movieSet) => {
    for (const rating in query.Rated) {
      const contentRatingIsClicked = query.Rated[rating];
      if (contentRatingIsClicked) {
        let rated = rating;
        rated = rated.toLowerCase();
        if (rated == "pg13") {
          rated = "pg-13";
        }
        let ratedResult = await fetchMoviesByContentRating(`${rated}`, setMovies, setError, 50);
        for (let i = 0; i < ratedResult.length; i++) {
          movieSet.add(ratedResult[i]);
        }
      }
    }
    return movieSet;
  };

  /**
   * based on the given movieSet, check if the user clicked any runtime filter buttons and
   * if so, return only the movies in the set that are under the desired maximum runtime
   * @param {JSON <object>} query - JSON of the filter buttons that the user clicked in their search
   * @param {Set} movieSet - set of movies from the user's search result
   * @return {Set} - set of movies from the user's search result based on the runtime filters
   */
  const crossFilterByRuntime = (query, movieSet) => {
    let moviesToKeep = new Set();
    for (const runtime in query.Runtime) {
      const runtimeIsClicked = query.Runtime[runtime];
      if (runtimeIsClicked) {
        let runtimeNumber = runtime;
        if (runtimeNumber == "Ninety") {
          runtimeNumber = 90;
        } else if (runtimeNumber == "OneTwenty") {
          runtimeNumber = 120;
        } else if (runtimeNumber == "OneEighty") {
          runtimeNumber = 180;
        }
        // keep movies from movieSet with desired runtime
        movieSet.forEach(movie => {
          let runtimeFull = movie.Runtime + "";
          let runtimeSlice = runtimeFull.slice(0, -4);
          let runtimeSliceNumber = +runtimeSlice;
          if (runtimeNumber >= runtimeSliceNumber) {
            moviesToKeep.add(movie);
          }
        });
      }
    }
    if (moviesToKeep.size == 0) {
      return movieSet;
    }
    return moviesToKeep;
  };

  /**
   * check if the user clicked any runtime filter buttons and if so, add movies of that maximum
   * runtime to the movieSet and return it
   * @param {JSON <object>} query - JSON of the filter buttons that the user clicked in their search
   * @param {Set} movieSet - set of movies from the user's search result
   * @return {Set} - set of movies from the user's search result based on the runtime filters
   */
  const filterByRuntime = async (query, movieSet) => {
    for (const runtime in query.Runtime) {
      const runtimeIsClicked = query.Runtime[runtime];
      if (runtimeIsClicked) {
        let runtimeNumber = runtime;
        if (runtimeNumber == "Ninety") {
          runtimeNumber = 90;
        } else if (runtimeNumber == "OneTwenty") {
          runtimeNumber = 120;
        } else if (runtimeNumber == "OneEighty") {
          runtimeNumber = 180;
        }
        let runtimeResult = await fetchMoviesByRuntime(`${runtimeNumber}`, setMovies, setError, 50);
        for (let i = 0; i < runtimeResult.length; i++) {
          movieSet.add(runtimeResult[i]);
        }
      }
    }
    return movieSet;
  };

  /**
   * takes in the given user data and displays it in the search results
   * @param {JSON <object>} result - user data resulting from the search
   */
  const displayUserSearchResult = async (result) => {
    document.getElementById("spinner").classList.add("hidden");
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

      const isBlockedByThem = await getBlockStatus(currentUserId, result[i].id);
      console.log(isBlockedByThem)

      if (!(isBlockedByThem === "blocked")) {

        const buttonContainer = document.createElement("div");
        buttonContainer.style.display = "flex";
        buttonContainer.style.flexDirection = "row";
        buttonContainer.style.gap = "10px"; // spacing between buttons
        buttonContainer.style.marginTop = "10px";

        //follow/unfollow button
        const followBtn = document.createElement("button");
        followBtn.classList.add("follow-button");
        followBtn.disabled = !currentUserId;
        if (currentUserId) {
          const relationshipStatus = await getRelationshipStatus(currentUserId, result[i].id);
          followBtn.innerText = relationshipStatus;
        } else {
          followBtn.innerText = "Follow";
        }

        followBtn.onclick = async () => {
          if (!currentUserId) {
            alert("Login not detected");
            return;
          }

          await toggleRelationship(currentUserId, result[i].id);

          // Refresh button text after change
          const updatedRelationship = await getRelationshipStatus(currentUserId, result[i].id);
          const updatedStatus = await getBlockStatus(currentUserId, result[i].id);
          followBtn.innerText = updatedRelationship;
          blockBtn.innerText = updatedStatus;
        };
        buttonContainer.appendChild(followBtn);


        // --- Block/Unblock button ---
        const blockBtn = document.createElement("button");

        blockBtn.classList.add("follow-button"); // reusing style
        blockBtn.disabled = !currentUserId;
        if (currentUserId) {
          const blockStatus = await getBlockStatus(currentUserId, result[i].id)
          blockBtn.innerText = blockStatus;
        }
        blockBtn.onclick = async () => {
          try {
            await toggleBlockUser(currentUserId, result[i].id,);
            const updatedRelationship = await getRelationshipStatus(currentUserId, result[i].id);
            const updatedStatus = await getBlockStatus(currentUserId, result[i].id);
            followBtn.innerText = updatedRelationship;
            blockBtn.innerText = updatedStatus;
          } catch (err) {
            console.error("Block error:", err);
            alert("Could not update block status.");
          }
        };
        buttonContainer.appendChild(blockBtn);

        // --- Message button ---
        const messageBtn = document.createElement("button");
        messageBtn.innerText = "Message";
        messageBtn.classList.add("follow-button");

        messageBtn.onclick = () => {
          navigate("/groups", {
            state: {
              chatUser: {
                id: user.id,
                name: user.name,
                username: user.username
              }
            }
          });
        };
        buttonContainer.appendChild(messageBtn);

        info.appendChild(buttonContainer);
      }
      else if (isBlockedByThem === "blocked") {
        const msg = document.createElement("div");
        msg.innerText = "User has blocked you";
        msg.style.color = "red";
        info.appendChild(msg);
        return;
      }
      document.getElementById("search-result-user").appendChild(user);
    }
  };

  /**
   * takes in the given movie data and displays it in the search results
   * @param {JSON <object>} result - movie data resulting from the search
   */
  const displayMovieSearchResult = async (result) => {
    document.getElementById("spinner").classList.add("hidden");
    if ((!result || result.length === 0) &&
        (!document.getElementById("filter-runtime-button").classList.contains("clicked") ||
         !document.getElementById("filter-content-rating-button").classList.contains("clicked"))) {
      document.getElementById("search-result-movie").innerHTML = "No movies found by that search term";
      return;
    }
    for (let i = 0; i < result.length; i++) {
      let movie = document.createElement("li");
      movie.id = result[i].imdbID;
      let poster = document.createElement("img");
      poster.src = result[i].Poster;
      poster.alt = result[i].Title + " movie poster";
      poster.onerror = () => {
        poster.src = defaultPoster;
      };
      poster.onclick = () => handleMovieClick(result[i].Title);
      movie.appendChild(poster);
      let info = document.createElement("div");
      movie.appendChild(info);
      let title = document.createElement("h1");
      title.textContent = result[i].Title;
      title.onclick = () => handleMovieClick(result[i].Title);
      info.appendChild(title);
      let yearRuntimeRating = document.createElement("h2");
      yearRuntimeRating.textContent = result[i].Year + " | " + result[i].Runtime + " | " + result[i].Rated;
      info.appendChild(yearRuntimeRating);
      let director = document.createElement("h2");
      director.textContent = "Directed by: " + result[i].Director;
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

  //gets current relationship between two users
  const getRelationshipStatus = async (currentUserId, targetUserId) => {
    try {
      const [followersRes, followingRes] = await Promise.all([
        fetch(`http://localhost:8000/get_followers/?id=${currentUserId}`, { credentials: "include" }),
        fetch(`http://localhost:8000/get_following/?id=${currentUserId}`, { credentials: "include" })
      ]);

      const followersData = await followersRes.json(); // followers of `targetUserId`
      const followingData = await followingRes.json(); // people `currentUserId` follows

      const youFollowThem = Object.keys(followingData).includes(targetUserId.toString());
      const theyFollowYou = Object.keys(followersData).includes(targetUserId.toString());

      console.log("followers data: ", followersData);
      console.log("following data: ", followingData);

      if (youFollowThem && theyFollowYou) return "Friends";
      else if (youFollowThem) return "Unfollow";
      else if (theyFollowYou) return "Follow Back";
      return "Follow";
    } catch (err) {
      console.error("Error checking relationship:", err);
      return "Follow"; // fallback
    }
  };

  const getBlockStatus = async (viewerId, profileId) => {
    try {
      const [youBlockedThemRes, theyBlockedYouRes] = await Promise.all([
        fetch(`http://localhost:8000/view_blocked_users/?id=${viewerId}`, { credentials: "include" }),
        fetch(`http://localhost:8000/view_blocked_users/?id=${profileId}`, { credentials: "include" })
      ]);

      const blockData = await youBlockedThemRes.json(); // followers of `targetUserId`
      const blockedData = await theyBlockedYouRes.json(); // people `currentUserId` follows*/

      const youBlockedThem = Object.keys(blockData).includes(profileId.toString());
      const theyBlockedYou = Object.keys(blockedData).includes(viewerId.toString());

      console.log("blocker data: ", blockData);
      console.log("blocked data: ", blockedData);

      if (theyBlockedYou) return "blocked";
      if (youBlockedThem) return "Unblock";
      return "Block";
    } catch (err) {
      console.error("Error checking relationship:", err);
      return "Block"; // fallback
    }
  };



  //follows or unfollows other user
  const toggleRelationship = async (followerId, followingId, skipBlockCheck = false) => {
    try {
      if (!skipBlockCheck) {
        const blockStatus = await getBlockStatus(followerId, followingId);

        if (blockStatus === "Unblock") {
          // You're trying to follow someone you blocked — first unblock
          await toggleBlockUser(followerId, followingId, true);
        }
      }
      const response = await fetch(`http://localhost:8000/create_relationship/?follower_id=${followerId}&following_id=${followingId}`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      //alert(data.message);
    } catch (err) {
      console.error("Failed to update relationship:", err);
      alert("Something went wrong.");
    }
  };

  //blocks or unblocks other user
  const toggleBlockUser = async (currentUserId, targetUserId, skipRelationshipCheck = false) => {
    try {
      if (!skipRelationshipCheck) {
        const relationshipStatus = await getRelationshipStatus(currentUserId, targetUserId);

        if (relationshipStatus === "Unfollow") {
          //unfollow other user if you're following them
          await toggleRelationship(currentUserId, targetUserId, true);
        }
        else if (relationshipStatus === "Friends") {
          //mutually unfollow each user if they're friends
          await toggleRelationship(currentUserId, targetUserId, true);  // unfollow them
          await toggleRelationship(targetUserId, currentUserId, true);  // unfollow you
        }
        else if (relationshipStatus === "Follow Back") {
          //makes user being blocked unfollow current user
          await toggleRelationship(targetUserId, currentUserId, true);
        }
      }
      const response = await fetch("http://localhost:8000/block_user/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          blocker_id: currentUserId,
          blocked_id: targetUserId,
        }),
      });
      const data = await response.json();
      if (data.message) {
        //alert(data.message);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error("Error blocking/unblocking user:", err);
      alert("Could not update block status.");
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
        <div id="search-container">
          <input
            type="text" id="search-input" placeholder="Type your search here..."
            value={searchInputText}
            onChange={(e) => setSearchInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                searchButtonAction();
            }}
          />
          <button id="search-button-actual" onClick={() => searchButtonAction()}>Search</button>
          <button id="toggle-filters-button" onClick={toggleFilters}>+</button>
          <div>
            <SpinnerCircular id="spinner" size={40} thickness={99} speed={100} color="#5A189A" secondaryColor="#3C092C" class="hidden" />
          </div>
          <p id="no-search-error" class="hidden">Please type your search in the search bar</p>
          <div id="filter-options" class="hidden">
            <button id="filter-genre-button" onClick={filterGenreButtonAction}>Genre</button>
            <button id="filter-content-rating-button" onClick={filterContentRatingButtonAction}>Content Rating</button>
            <button id="filter-runtime-button" onClick={filterRuntimeButtonAction}>Runtime</button>
            <button id="filter-director-button" onClick={filterDirectorButtonAction}>Director</button>
            <button id="filter-year-button" onClick={filterYearButtonAction}>Year</button>
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
            <button id="genre-filter-fantasy-button" onClick={genreFilterButtonAction}>Fantasy</button>
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
            <button id="90-min-button" onClick={runtimeFilterButtonAction}>90 Min</button>
            <button id="120-min-button" onClick={runtimeFilterButtonAction}>120 Min</button>
            <button id="180-min-button" onClick={runtimeFilterButtonAction}>180 Min</button>
          </div>
          <div id="director-filter-options" class="hidden">
            <p>To search by <strong>director</strong>, search the <strong>director's name</strong> in the search bar</p>
          </div>
          <div id="year-filter-options" class="hidden">
            <p>To search by <strong>year</strong>, type the desired <strong>year</strong> in the search bar</p>
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
