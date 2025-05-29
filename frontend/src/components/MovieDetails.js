import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
// ADDED: Import useQueryClient for cache invalidation
import { useQueryClient } from "@tanstack/react-query";
import FriendsWhoWatched from './FriendsWhoWatched';

const MovieDetailsPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const release_date = queryParams.get("release_date");

  // ADDED: Initialize queryClient for cache invalidation
  const queryClient = useQueryClient();

  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState(null);
  const [movie, setMovie] = useState(null);
  const [posterURL, setPosterURL] = useState(null);
  const [backdropURL, setBackdropURL] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [loadingAdd, setLoadingAdd] = useState(false);
  const [message, setMessage] = useState(null);
  // ADDED: Animation state for success message
  const [messageAnimating, setMessageAnimating] = useState(false);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showWatchedForm, setShowWatchedForm] = useState(false);
  const [watchedRating, setWatchedRating] = useState("");
  const [watchedReview, setWatchedReview] = useState("");

  const [enhancedPlot, setEnhancedPlot] = useState(null);
  const [loadingPlot, setLoadingPlot] = useState(false);
  const hasEnhancedPlot = useRef(false);

  const [userGroups, setUserGroups] = useState([]);
  const [userFriends, setUserFriends] = useState([]);
  const [showGroupList, setShowGroupList] = useState(false);
  const [showFriendList, setShowFriendList] = useState(false);

  // ADDED: New state for watchlist submenu
  const [userWatchlists, setUserWatchlists] = useState([]);
  const [showWatchlistSubmenu, setShowWatchlistSubmenu] = useState(false);
  const [loadingWatchlists, setLoadingWatchlists] = useState(false);

  // ADDED: Enhanced message display function with animations
  const showAnimatedMessage = (text, type = "success") => {
    setMessage({ text, type });
    
    // Trigger slide-in animation
    setTimeout(() => {
      setMessageAnimating(true);
    }, 10);
    
    // Start slide-out animation after 2.5 seconds
    setTimeout(() => {
      setMessageAnimating(false);
    }, 2500);
    
    // Remove message completely after slide-out completes
    setTimeout(() => {
      setMessage(null);
    }, 3000);
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const resp = await fetch("http://localhost:8000/user_info/", {
          credentials: "include",
        });
        if (!resp.ok) throw new Error("Failed to fetch user info");
        const js = await resp.json();
        setUserId(js.id);
        setUsername(js.username);
      } catch (e) {
        console.error("user_info error:", e);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!username || !userId) return;
    const fetchGroupsAndFriends = async () => {
      try {
        const groupsRes = await fetch(`http://localhost:8000/get_user_groups/?username=${username}`, { credentials: "include" });
        const groupsData = await groupsRes.json();
        setUserGroups(groupsData.groups || []);

        const friendsRes = await fetch(`http://localhost:8000/get_mutual_friends/?id=${userId}`, { credentials: "include" });
        const friendsData = await friendsRes.json();
        setUserFriends(friendsData.friends || []);
      } catch (error) {
        console.error("Failed to fetch groups/friends:", error);
      }
    };

    fetchGroupsAndFriends();
  }, [username, userId]);

  useEffect(() => {
    const fetchOMDB = async () => {
      try {
        let url = `http://localhost:8000/api_search/?title=${encodeURIComponent(id)}`;
        if (release_date) url += `&release_date=${encodeURIComponent(release_date)}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (resp.ok && data.Title) {
          const base = {
            id,
            title: data.Title,
            year: data.Year,
            runtime: data.Runtime,
            rating: data.Rated,
            plot: data.Plot,
            director: data.Director,
            db_id: null,
          };
          setMovie(base);
          return base;
        } else {
          throw new Error(data.error || "Movie not found");
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchLocalId = async (title, year) => {
      try {
        const resp = await fetch(`http://localhost:8000/search/?filter=movie&q=${encodeURIComponent(title)}&year=${encodeURIComponent(year)}`);
        const d = await resp.json();
        if (resp.ok && d.movies?.length) {
          setMovie(prev => ({ ...prev, db_id: d.movies[0].id }));
        }
      } catch {
        console.warn("Failed to fetch local DB ID");
      }
    };

    fetchOMDB().then(m => {
      if (m) {
        fetchLocalId(m.title, m.year);
        if (!hasEnhancedPlot.current) {
          enhancePlot(m);
          hasEnhancedPlot.current = true;
        }
        fetchBackdrop(m.title);
      }
    });
  }, [id, release_date]);

  const fetchBackdrop = async title => {
    try {
      const resp = await fetch(`http://localhost:8000/movie_backdrop/?title=${encodeURIComponent(title)}`);
      const d = await resp.json();
      if (d.backdrop) setBackdropURL(d.backdrop);
    } catch (e) {
      console.error("Backdrop fetch failed", e);
    }
  };

  useEffect(() => {
    if (!movie) return;
    (async () => {
      try {
        const resp = await fetch(`http://localhost:8000/movie_poster/?title=${encodeURIComponent(movie.title)}`);
        const d = await resp.json();
        if (d.poster) setPosterURL(d.poster);
      } catch (e) {
        console.error("Poster fetch failed", e);
      }
    })();
  }, [movie]);

  const enhancePlot = async m => {
    setLoadingPlot(true);
    try {
      const resp = await fetch("http://localhost:8000/generate-movie-summary/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movie_info: { title: m.title, year: m.year, director: m.director, plot: m.plot } }),
      });
      const d = await resp.json();
      if (resp.ok) setEnhancedPlot(d.summary);
      else throw new Error(d.error || "Enhancement failed");
    } catch (e) {
      console.error("Enhance plot failed", e);
      setEnhancedPlot(m.plot);
    } finally {
      setLoadingPlot(false);
    }
  };

  // ADDED: Function to fetch user's watchlists
  const fetchUserWatchlists = async () => {
    setLoadingWatchlists(true);
    try {
      const resp = await fetch("http://localhost:8000/grab_watchlist/", { 
        credentials: "include" 
      });
      const data = await resp.json();
      
      if (resp.ok && data.status === "success") {
        setUserWatchlists(data.watchlist || []);
      } else {
        throw new Error(data.message || "Failed to fetch watchlists");
      }
    } catch (e) {
      console.error("Failed to fetch watchlists:", e);
      showAnimatedMessage("Failed to load watchlists", "error");
    } finally {
      setLoadingWatchlists(false);
    }
  };

  // UPDATED: Modified to show watchlist submenu instead of popup
  const addToWatchlist = async () => {
    await fetchUserWatchlists();
    setShowWatchlistSubmenu(true);
  };

  // ADDED: Function to add movie to specific watchlist
  const addToSpecificWatchlist = async (watchlistName) => {
    setLoadingAdd(true);
    try {
      const idToSend = movie.db_id || movie.id;
      const url = `http://localhost:8000/add_movie/?movie_id=${idToSend}&watchlist_name=${encodeURIComponent(watchlistName)}`;
      const resp = await fetch(url, { credentials: "include" });
      const d = await resp.json();
      
      if (resp.ok) {
        // SUCCESS: Invalidate watchlist cache to show updated data immediately
        await queryClient.invalidateQueries({ 
          queryKey: ['watchlistMovies'] 
        });
        showAnimatedMessage(d.message || `Added to ${watchlistName}`, "success");
      } else {
        throw new Error(d.error || "Failed to add to watchlist");
      }
    } catch (e) {
      console.error(e);
      showAnimatedMessage(e.message || "Failed to add to watchlist", "error");
    } finally {
      setLoadingAdd(false);
      setShowWatchlistSubmenu(false);
      setShowAddMenu(false);
    }
  };

  const sendToGroup = async (groupId) => {
    setLoadingAdd(true);
    try {
      const idToSend = movie.db_id || movie.id;
      const resp = await fetch("http://localhost:8000/recommend_movie/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          member_suggested: userId,
          user_receiving: groupId,
          movie_id: idToSend
        }),
      });
      const data = await resp.json();
      if (resp.ok) {
        showAnimatedMessage(data.message || "Recommendation sent to group!", "success");
      } else {
        throw new Error(data.error || "Failed to send recommendation");
      }
    } catch (e) {
      console.error(e);
      showAnimatedMessage(e.message || "Failed to send to group", "error");
    } finally {
      setLoadingAdd(false);
      setShowGroupList(false);
    }
  };

  const sendToFriend = async (friendId) => {
    setLoadingAdd(true);
    try {
      const idToSend = movie.db_id || movie.id;
      const resp = await fetch("http://localhost:8000/recommend_movie/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          member_suggested: userId,
          user_receiving: friendId,
          movie_id: idToSend
        }),
      });
      const data = await resp.json();
      if (resp.ok) {
        showAnimatedMessage(data.message || "Recommendation sent to friend!", "success");
      } else {
        throw new Error(data.error || "Failed to send recommendation");
      }
    } catch (e) {
      console.error(e);
      showAnimatedMessage(e.message || "Failed to send to friend", "error");
    } finally {
      setLoadingAdd(false);
      setShowFriendList(false);
    }
  };

  // UPDATED: Enhanced cache invalidation for watched movies
  const addToWatched = async () => {
    if (!watchedRating || userId == null) return;
    setLoadingAdd(true);
    try {
      const idToSend = movie.db_id || movie.id;
      const resp = await fetch("http://localhost:8000/add_to_watched/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: userId,
          movie_id: idToSend,
          rating: parseInt(watchedRating, 10),
          review: watchedReview
        }),
      });
      const d = await resp.json();
      showAnimatedMessage(d.message, resp.ok ? "success" : "error");

      if (resp.ok) {
        // ENHANCED: Invalidate all relevant caches including watchlist
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['recentlyWatched'] }),
          queryClient.invalidateQueries({ queryKey: ['reviewedMovies', userId] }),
          queryClient.invalidateQueries({ queryKey: ['movieDetails', id] }),
          queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
          queryClient.invalidateQueries({ queryKey: ['watchedMovies'] }),
          // ADDED: Also invalidate the specific watchlistMovies query key
          queryClient.invalidateQueries({ queryKey: ['watchlistMovies'] }),
        ]);
      }
    } catch (e) {
      console.error(e);
      showAnimatedMessage("Failed to mark watched", "error");
    } finally {
      setLoadingAdd(false);
      setShowWatchedForm(false);
      setShowAddMenu(false);
      setWatchedRating("");
      setWatchedReview("");
    }
  };

  if (loading) return <div style={styles.loading}>Loading…</div>;
  if (error) return <div style={styles.error}>Error: {error}</div>;

  return (
    <div style={{ ...styles.container, backgroundImage: backdropURL ? `url(${backdropURL})` : undefined }}>
      <div style={styles.backdropOverlay} />
      {message && (
        <div style={{
          ...styles.successPopup, 
          backgroundColor: message.type === "success" ? "#4caf50" : "#f44336",
          transform: messageAnimating ? "translateX(0)" : "translateX(100%)",
          opacity: messageAnimating ? 1 : 0,
        }}>
          <div style={styles.successContent}>
            <span style={styles.successIcon}>
              {message.type === "success" ? "✓" : "✕"}
            </span>
            <span style={styles.successText}>{message.text}</span>
          </div>
        </div>
      )}

      <div style={styles.mainContentWrapper}>
        <div style={styles.movieDetailsSection}>
          <div style={styles.detailsWrapper}>
            <div style={styles.posterContainer}>
              <img src={posterURL || "https://via.placeholder.com/300x450"} alt={movie.title} style={styles.poster} />

              <button
                style={styles.addButton}
                onClick={() => { 
                  setShowAddMenu(s => !s); 
                  setShowWatchedForm(false); 
                  setShowWatchlistSubmenu(false); // Reset watchlist submenu when toggling main menu
                }}
                disabled={loadingAdd}
              >
                {loadingAdd ? "…" : "+"}
              </button>

              {showAddMenu && (
                <div style={styles.addMenu} key={showWatchlistSubmenu ? 'watchlist' : 'main'}>
                  {!showWatchlistSubmenu ? (
                    // Main menu options
                    <>
                      <button 
                        style={styles.menuButton}
                        onClick={addToWatchlist}
                      >
                        Add to Watchlist
                      </button>
                      <button 
                        style={styles.menuButton}
                        onClick={() => {
                          setShowGroupList(true);
                          setShowAddMenu(false);
                        }}
                      >
                        Send to Group
                      </button>
                      <button 
                        style={styles.menuButton}
                        onClick={() => {
                          setShowFriendList(true);
                          setShowAddMenu(false);
                        }}
                      >
                        Send to Friend
                      </button>
                      <button 
                        style={styles.menuButton}
                        onClick={() => {
                          setShowWatchedForm(true);
                          setShowAddMenu(false);
                        }}
                      >
                        Mark as Watched
                      </button>
                    </>
                  ) : (
                    // Watchlist selection submenu
                    <>
                      <button 
                        style={styles.backButton}
                        onClick={() => setShowWatchlistSubmenu(false)}
                      >
                        ← Back
                      </button>
                      {loadingWatchlists ? (
                        <div style={styles.loadingItem}>Loading watchlists...</div>
                      ) : userWatchlists.length > 0 ? (
                        userWatchlists.map(watchlist => (
                          <button 
                            key={watchlist.id}
                            style={styles.menuButton}
                            onClick={() => addToSpecificWatchlist(watchlist.name)}
                          >
                            {watchlist.name}
                          </button>
                        ))
                      ) : (
                        <div style={styles.noItemsText}>No watchlists found</div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* REMOVED: Watchlist selection popup */}
            </div>

            <div style={styles.info}>
              <h1 style={styles.title}>{movie.title}</h1>
              <div style={styles.metaBadges}>
                <span style={styles.badge}>📅 {movie.year}</span>
                <span style={styles.badge}>⭐ {movie.rating}</span>
                <span style={styles.badge}>⏱ {movie.runtime}</span>
                <span style={styles.badge}>
                  🎬{" "}
                  <Link to={`/search?filter=director&q=${encodeURIComponent(movie.director)}`} style={styles.link}>
                    {movie.director}
                  </Link>
                </span>
              </div>

              <h2 style={styles.sectionTitle}>Plot</h2>
              {loadingPlot
                ? <div style={styles.plotLoading}>Generating enhanced description…</div>
                : <p style={styles.plotText}>{enhancedPlot || movie.plot}</p>
              }
            </div>
          </div>
        </div>

        <div style={styles.sidebarSection}>
          {userId && movie && (
            <FriendsWhoWatched 
              movieId={movie.db_id || movie.id} 
              userId={userId} 
            />
          )}
        </div>
      </div>

      {showWatchedForm && (
        <div style={styles.modalOverlay}>
          <div style={styles.watchedForm}>
            <h3>Mark as Watched</h3>
            <label style={styles.formLabel}>
              Rating:
              <select 
                value={watchedRating} 
                onChange={e => setWatchedRating(e.target.value)} 
                style={styles.formInput}
                required
              >
                <option value="">Select</option>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label style={styles.formLabel}>
              Review:
              <textarea 
                value={watchedReview} 
                onChange={e => setWatchedReview(e.target.value)} 
                maxLength={2000} 
                style={{...styles.formInput, minHeight: '100px'}}
              />
            </label>
            <div style={styles.formButtons}>
              <button 
                style={{...styles.formButton, backgroundColor: '#7d00ff'}}
                onClick={addToWatched} 
                disabled={loadingAdd}
              >
                {loadingAdd ? "Submitting..." : "Submit"}
              </button>
              <button 
                style={{...styles.formButton, backgroundColor: '#444'}}
                onClick={() => { 
                  setShowWatchedForm(false); 
                  setWatchedRating(''); 
                  setWatchedReview(''); 
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}



      {showGroupList && (
        <div style={styles.modalOverlay}>
          <div style={styles.listModal}>
            <h3>Select a Group</h3>
            <div style={styles.listContainer}>
              {userGroups.length > 0 ? (
                userGroups.map(group => (
                  <div 
                    key={group.group_id}
                    style={styles.listItem}
                    onClick={() => sendToGroup(group.group_id)}
                  >
                    {group.group_name}
                  </div>
                ))
              ) : (
                <p style={{ color: '#fff' }}>You don't have any groups yet.</p>
              )}
            </div>
            <button 
              style={styles.closeButton}
              onClick={() => setShowGroupList(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showFriendList && (
        <div style={styles.modalOverlay}>
          <div style={styles.listModal}>
            <h3>Select a Friend</h3>
            <div style={styles.listContainer}>
              {userFriends.length > 0 ? (
                userFriends.map(friend => (
                  <div 
                    key={friend.id}
                    style={styles.listItem}
                    onClick={() => sendToFriend(friend.id)}
                  >
                    {friend.username}
                  </div>
                ))
              ) : (
                <p style={{ color: '#fff' }}>You don't have any friends yet.</p>
              )}
            </div>
            <button 
              style={styles.closeButton}
              onClick={() => setShowFriendList(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
    container: { 
    position: "relative", 
    padding: "40px 20px", 
    color: "#fff", 
    backgroundColor: "#240046", 
    backgroundSize: "cover", 
    backgroundPosition: "center", 
    backgroundRepeat: "no-repeat", 
    minHeight: "81vh" 
  },
  backdropOverlay: { 
    position: "absolute", 
    inset: 0, 

    backgroundImage: "radial-gradient(circle at center center, rgb(87,0,108),rgb(16,0,43))", 

    zIndex: 0 
  },
  loading: { 
    color: "#fff", 
    textAlign: "center", 
    padding: "40px", 
    fontSize: "1.2rem" 
  },
  error: { 
    color: "#ff6b6b", 
    textAlign: "center", 
    padding: "40px", 
    fontSize: "1.2rem" 
  },
  successPopup: {
    position: "fixed",
    top: "120px",
    right: "20px",
    padding: "16px 20px",
    color: "#fff",
    borderRadius: "8px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
    zIndex: 9999,
    minWidth: "300px",
    maxWidth: "400px",
    transition: "all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    border: "1px solid rgba(255,255,255,0.2)",
    backdropFilter: "blur(10px)",
  },
  successContent: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  successIcon: {
    fontSize: "20px",
    fontWeight: "bold",
  },
  successText: {
    fontSize: "1rem",
    flex: 1,
  },
  mainContentWrapper: {
    display: "flex",
    gap: "20px",
    maxWidth: "1400px",
    margin: "0 auto",
    position: "relative",
    zIndex: 1,
  },
  movieDetailsSection: {
    flex: "0 0 80%",
    width: "80%",
  },
  sidebarSection: {
    flex: "0 0 20%",
    width: "20%",
    position: "sticky",
    top: "20px",
    alignSelf: "flex-start",
  },
  detailsWrapper: { 
    display: "flex", 
    gap: "40px", 
    alignItems: "center", 
  },
  posterContainer: { 
    position: "relative", 
    width: "300px", 
    flexShrink: 0, 
    borderRadius: "8px", 
    overflow: "hidden", 
    boxShadow: "0 4px 12px rgba(0,0,0,0.6)" 
  },
  poster: { 
    width: "100%", 
    display: "block" 
  },
  addButton: { 
    position: "absolute", 
    top: "15px", 
    right: "15px", 
    backgroundColor: "#7d00ff", 
    border: "none", 
    color: "#fff", 
    cursor: "pointer", 
    fontSize: "24px", 
    width: "40px", 
    height: "40px", 
    borderRadius: "50%", 
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)", 
    transition: "all 0.2s",
    ":hover": {
      backgroundColor: "#9a36ff",
      transform: "scale(1.1)"
    }
  },
  addMenu: {
    position: "absolute",
    top: "60px",
    right: "15px",
    backgroundColor: "#240046",
    border: "1px solid #7d00ff",
    borderRadius: "6px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
    zIndex: 10,
    width: "200px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    minHeight: "0", // Add this to prevent height artifacts
  },
  menuButton: {
    padding: "12px 16px",
    backgroundColor: "transparent",
    border: "none",
    color: "#fff",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "1rem",
    transition: "all 0.2s",
    ":hover": {
      backgroundColor: "rgba(125,0,255,0.4)"
    }
  },
  backButton: {
    padding: "12px 16px",
    backgroundColor: "rgba(125,0,255,0.3)",
    border: "none",
    color: "#fff",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "1rem",
    transition: "all 0.2s",
    borderBottom: "1px solid rgba(125,0,255,0.5)",
    ":hover": {
      backgroundColor: "rgba(125,0,255,0.5)"
    }
  },
  loadingItem: {
    padding: "12px 16px",
    color: "#adb5bd",
    fontSize: "1rem",
    textAlign: "center",
    fontStyle: "italic",
  },
  noItemsText: {
    padding: "12px 16px",
    color: "#adb5bd",
    fontSize: "1rem",
    textAlign: "center",
  },
  info: { 
    flex: 1,
  },
  title: { 
    margin: "0 0 15px", 
    fontSize: "2.5rem", 
    color: "#fff",
  },
  metaBadges: { 
    marginBottom: "20px", 
    display: "flex", 
    flexWrap: "wrap", 
    gap: "10px",
  },
  badge: { 
    backgroundColor: "rgba(255,255,255,0.2)", 
    padding: "6px 12px", 
    borderRadius: "4px", 
    fontSize: "0.9rem" 
  },
  sectionTitle: { 
    fontSize: "1.5rem", 
    marginBottom: "15px", 
    color: "#e0aaff" 
  },
  plotLoading: { 
    color: "#adb5bd", 
    fontStyle: "italic", 
    marginBottom: "25px" 
  },
  plotText: { 
    lineHeight: "1.6", 
    marginBottom: "25px", 
    fontSize: "1.1rem" 
  },
  link: { 
    color: "inherit", 
    textDecoration: "none" 
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  watchedForm: {
    backgroundColor: "#240046",
    padding: "20px",
    borderRadius: "8px",
    width: "90%",
    maxWidth: "400px",
    border: "1px solid #7d00ff",
    boxShadow: "0 0 20px rgba(125,0,255,0.5)",
  },
  formLabel: {
    display: "flex",
    flexDirection: "column",
    marginBottom: "15px",
    color: "#fff",
    fontSize: "1rem",
  },
  formInput: {
    padding: "8px",
    borderRadius: "4px",
    border: "none",
    fontSize: "1rem",
    marginTop: "5px",
    backgroundColor: "#fff",
    color: "#000",
  },
  formButtons: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "20px",
  },
  formButton: {
    padding: "10px 20px",
    borderRadius: "6px",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontSize: "1rem",
    transition: "opacity 0.2s",
    ":hover": {
      opacity: 0.9
    }
  },
  listModal: {
    backgroundColor: "#240046",
    padding: "20px",
    borderRadius: "8px",
    width: "90%",
    maxWidth: "400px",
    border: "1px solid #7d00ff",
    boxShadow: "0 0 20px rgba(125,0,255,0.5)",
  },
  listContainer: {
    maxHeight: "60vh",
    overflowY: "auto",
    margin: "15px 0",
  },
  listItem: {
    padding: "12px",
    backgroundColor: "rgba(125,0,255,0.2)",
    borderRadius: "6px",
    marginBottom: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    ":hover": {
      backgroundColor: "rgba(125,0,255,0.4)"
    }
  },
  closeButton: {
    padding: "10px 20px",
    backgroundColor: "#444",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "1rem",
    marginTop: "10px",
    width: "100%",
    ":hover": {
      opacity: 0.9
    }
  }
};

export default MovieDetailsPage;