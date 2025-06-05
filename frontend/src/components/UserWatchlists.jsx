import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchAllWatchlists, 
  createWatchlist, 
  fetchWatchlistMoviesById
} from "../api";

const UserWatchlists = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedWatchlistId, setSelectedWatchlistId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [newWatchlistDescription, setNewWatchlistDescription] = useState("");
  const [csrfToken, setCsrfToken] = useState("");

  //Fetching CSRF token
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await fetch("http://localhost:8000/get-csrf-token/", {
          credentials: "include",
        });
        const data = await response.json();
        setCsrfToken(data.csrfToken);
      } catch (error) {
        console.error("Error fetching CSRF token:", error);
      }
    };
    fetchCsrfToken();
  }, []);

  //Fetch all watchlists, refreshes after 5 minutes 
  const { data: watchlists = [], isLoading: loadingWatchlists } = useQuery({
    queryKey: ['userWatchlists'],
    queryFn: fetchAllWatchlists,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  //Main watchlist is always first and after that its alphabetical
  const sortedWatchlists = React.useMemo(() => {
    if (!watchlists.length) return [];
    
    return [...watchlists].sort((a, b) => {
      //Checking for main watchlist
      if (a.name === "Watchlist" && b.name !== "Watchlist") return -1;
      if (b.name === "Watchlist" && a.name !== "Watchlist") return 1;
      

      return a.name.localeCompare(b.name);
    });
  }, [watchlists]);

  //Main watchlist is always displayed first
  useEffect(() => {
    if (sortedWatchlists.length > 0 && !selectedWatchlistId) {
      setSelectedWatchlistId(sortedWatchlists[0].id);
    }
  }, [sortedWatchlists, selectedWatchlistId]);

  //Fetch movies for selected watchlist
  const { data: movies = [], isLoading: loadingMovies, error } = useQuery({
    queryKey: ['watchlistMovies', selectedWatchlistId],
    queryFn: () => fetchWatchlistMoviesById(selectedWatchlistId),
    enabled: !!selectedWatchlistId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  //Create watchlist dialogue box
  const createWatchlistMutation = useMutation({
    mutationFn: (watchlistData) => createWatchlist(csrfToken, watchlistData),
    onSuccess: async (response) => {

      setShowCreateModal(false);
      setNewWatchlistName("");
      setNewWatchlistDescription("");
      
      //Shows success if successfully created
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 3000); // Hide after 3 seconds
      
      try {
        await queryClient.refetchQueries(['userWatchlists']);
        
        //Select newly created watchlist
        setTimeout(() => {
          const updatedWatchlists = queryClient.getQueryData(['userWatchlists']) || [];
          const newWatchlist = updatedWatchlists.find(w => w.name === response.data.name);
          if (newWatchlist) {
            setSelectedWatchlistId(newWatchlist.id);
          }
        }, 100);
      } catch (error) {
        console.error('Error updating watchlists after creation:', error);
      }
    },
    onError: (error) => {
      alert(`Error creating watchlist: ${error.message}`);
    }
  });

  //Sort movies by date added
  const sortedMovies = React.useMemo(() => {
    if (!movies.length) return [];
    
    return [...movies].sort((a, b) => {
      const dateA = a.added_at;
      const dateB = b.added_at;
      return new Date(dateB) - new Date(dateA);
    });
  }, [movies]);

  const handleCreateWatchlist = () => {
    if (!newWatchlistName.trim()) {
      alert("Please enter a watchlist name");
      return;
    }
    
    //Creates watchlist when name is entered
    createWatchlistMutation.mutate({
      watchlist_name: newWatchlistName,

    });
  };

  const handleMovieClick = (movie) => {
    const titleParam = encodeURIComponent(movie.title || movie.original_title);
    const releaseDate = movie.release_date;
    if (releaseDate) {
      navigate(`/movie/${titleParam}?release_date=${encodeURIComponent(releaseDate)}`);
    } else {
      navigate(`/movie/${titleParam}`);
    }
  };

  const getPosterUrl = (movie) => {
    if (movie.poster) {
      return movie.poster;
    }
    if (movie.poster_path && movie.poster_path !== "N/A") {
      return `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
    }
    return "https://via.placeholder.com/250x375?text=No+Image";
  };

  const getSelectedWatchlistName = () => {
    const selected = sortedWatchlists.find(w => w.id === selectedWatchlistId);
    return selected?.name || "Your Watchlist";
  };

  if (loadingWatchlists) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading watchlists...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>

      <div style={styles.carouselSection}>
        <div style={styles.carouselContainer}>
          <div style={styles.carouselTrack}>
            {/* Existing Watchlists */}
            {sortedWatchlists.map((watchlist) => (
              <div
                key={watchlist.id}
                style={{
                  ...styles.watchlistTab,
                  ...(selectedWatchlistId === watchlist.id ? styles.activeTab : {})
                }}
                className="carousel-item"
                onClick={() => setSelectedWatchlistId(watchlist.id)}
              >
                <span style={styles.tabText}>
                  {watchlist.name}
                </span>
                {watchlist.movie_count !== undefined && (
                  <span style={styles.movieCount}>
                    {watchlist.movie_count}
                  </span>
                )}
              </div>
            ))}

            {/* Create New Watchlist Button */}
            <div 
              style={styles.createButton}
              onClick={() => setShowCreateModal(true)}
              className="carousel-item"
            >
              <span style={styles.plusIcon}>+</span>
            </div>
          </div>
        </div>
      </div>

      {/* Movies Grid */}
      {loadingMovies ? (
        <div style={styles.loading}>Loading movies...</div>
      ) : error ? (
        <div style={styles.error}>
          Error loading movies: {error.message}
        </div>
      ) : !sortedMovies.length ? (
        <div style={styles.emptyMessage}>No movies in this watchlist.</div>
      ) : (
        <div style={styles.grid}>
          {sortedMovies.map((movie, index) => (
            <div
              key={`${movie.id}-${index}`}
              style={styles.card}
              className="movie-card"
              onClick={() => handleMovieClick(movie)}
            >
              <img
                src={getPosterUrl(movie)}
                alt={movie.title || movie.original_title}
                style={styles.poster}
              />
              <div style={styles.info}>
                <h2 style={styles.title}>{movie.title || movie.original_title}</h2>
                {movie.release_date && (
                  <p style={styles.releaseDate}>
                    {new Date(movie.release_date).getFullYear()}
                  </p>
                )}
                {movie.added_at && (
                  <p style={styles.dateAdded}>
                    Added {new Date(movie.added_at).toLocaleDateString()}
                  </p>
                )}
                {movie.overview && (
                  <p style={styles.overview}>
                    {movie.overview.length > 150 
                      ? `${movie.overview.substring(0, 150)}...` 
                      : movie.overview
                    }
                  </p>
                )}
                {movie.vote_average && (
                  <p style={styles.rating}>
                    ⭐ {movie.vote_average.toFixed(1)}/10
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}


      {showCreateModal && (
        <div style={styles.modal} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Create New Watchlist</h2>
            <input
              type="text"
              placeholder="Watchlist name"
              value={newWatchlistName}
              onChange={(e) => setNewWatchlistName(e.target.value)}
              style={styles.input}
              autoFocus
            />
            <textarea
              placeholder="Description (optional)"
              value={newWatchlistDescription}
              onChange={(e) => setNewWatchlistDescription(e.target.value)}
              style={styles.textarea}
              rows="3"
            />
            <div style={styles.modalButtons}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWatchlist}
                style={styles.createButtonModal}
                disabled={createWatchlistMutation.isLoading}
              >
                {createWatchlistMutation.isLoading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div style={styles.successPopup}>
          <div style={styles.successPopupContent}>
            <span style={styles.checkIcon}>✓</span>
            <span style={styles.successText}>Watchlist created successfully!</span>
          </div>
        </div>
      )}

      <style>{`
        a { text-decoration: none; color: inherit; }
        .movie-card:hover { transform: scale(1.02); }
        .carousel-item:hover { transform: translateY(-2px); }
        
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: "#1D0037",
    backgroundImage: "radial-gradient(circle at center center, rgb(87,0,108),rgb(16,0,43))",
    minHeight: "100vh",
    padding: "40px 80px 80px 80px",
    color: "#fff",
  },
  carouselSection: {
    marginBottom: "30px",
  },
  carouselContainer: {
    overflow: "auto",
    padding: "10px 0",
  },
  carouselTrack: {
    display: "flex",
    gap: "16px",
    paddingBottom: "10px",
    minWidth: "min-content",
  },
  createButton: {
    minWidth: "60px",
    height: "50px",
    backgroundColor: "rgba(147, 51, 234, 0.2)",
    border: "2px dashed rgba(147, 51, 234, 0.5)",
    borderRadius: "12px",
    padding: "8px 16px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  plusIcon: {
    fontSize: "24px",
    color: "#9333ea",
    fontWeight: "300",
  },
  watchlistTab: {
    minWidth: "120px",
    height: "50px",
    backgroundColor: "rgba(36,0,70,0.8)",
    borderRadius: "12px",
    padding: "8px 16px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    border: "2px solid transparent",
    flexShrink: 0,
  },
  activeTab: {
    backgroundColor: "rgba(147, 51, 234, 0.3)",
    border: "2px solid #9333ea",
    boxShadow: "0 4px 12px rgba(147, 51, 234, 0.3)",
  },
  tabText: {
    fontSize: "0.9rem",
    fontWeight: "500",
    textAlign: "center",
    lineHeight: "1.2",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "100%",
  },
  movieCount: {
    fontSize: "0.7rem",
    color: "#aaa",
    marginTop: "2px",
  },
  pageTitle: {
    fontSize: "3rem",
    marginBottom: "40px",
    textAlign: "center",
    fontWeight: "bold",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: "30px",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "rgba(36,0,70,0.95)",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 6px 16px rgba(0,0,0,0.6)",
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  poster: {
    width: "100%",
    height: "auto",
    objectFit: "cover",
    aspectRatio: "2/3",
  },
  info: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  title: {
    margin: 0,
    fontSize: "1.5rem",
    marginBottom: "8px",
  },
  releaseDate: {
    fontSize: "1rem",
    color: "#ffcc00",
    margin: "4px 0 8px 0",
    fontWeight: "500",
  },
  dateAdded: {
    fontSize: "0.9rem",
    color: "#aaa",
    margin: "4px 0 8px 0",
  },
  overview: {
    flexGrow: 1,
    color: "#e0e0e0",
    marginBottom: "12px",
    fontSize: "1rem",
    lineHeight: 1.4,
  },
  rating: {
    fontSize: "0.9rem",
    color: "#aaa",
    margin: "4px 0 0 0",
  },
  loading: {
    textAlign: "center",
    padding: "80px",
    fontSize: "1.4rem",
    color: "#ccc",
  },
  error: {
    textAlign: "center",
    padding: "80px",
    fontSize: "1.4rem",
    color: "#ff6b6b",
  },
  emptyMessage: {
    textAlign: "center",
    padding: "40px",
    fontSize: "1.2rem",
    color: "#ccc",
  },
  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#240046",
    padding: "32px",
    borderRadius: "16px",
    width: "90%",
    maxWidth: "500px",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
  },
  modalTitle: {
    fontSize: "2rem",
    marginBottom: "24px",
    color: "#fff",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "1px solid rgba(147, 51, 234, 0.3)",
    backgroundColor: "rgba(36, 0, 70, 0.8)",
    color: "#fff",
    marginBottom: "16px",
    outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "12px 16px",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "1px solid rgba(147, 51, 234, 0.3)",
    backgroundColor: "rgba(36, 0, 70, 0.8)",
    color: "#fff",
    marginBottom: "24px",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
  },
  modalButtons: {
    display: "flex",
    gap: "16px",
    justifyContent: "flex-end",
  },
  cancelButton: {
    padding: "12px 24px",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "1px solid rgba(147, 51, 234, 0.5)",
    backgroundColor: "transparent",
    color: "#9333ea",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  createButtonModal: {
    padding: "12px 24px",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#9333ea",
    color: "#fff",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontWeight: "600",
  },
  successPopup: {
    position: "fixed",
    top: "120px",
    right: "20px",
    zIndex: 1100,
    animation: "slideInRight 0.3s ease-out",
  },
  successPopupContent: {
    backgroundColor: "#10b981",
    color: "#fff",
    padding: "16px 24px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    boxShadow: "0 8px 24px rgba(16, 185, 129, 0.3)",
    minWidth: "280px",
  },
  checkIcon: {
    fontSize: "20px",
    fontWeight: "bold",
    backgroundColor: "#fff",
    color: "#10b981",
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  successText: {
    fontSize: "1rem",
    fontWeight: "500",
  },
};

export default UserWatchlists;