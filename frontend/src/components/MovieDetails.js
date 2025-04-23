// src/pages/MovieDetailsPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "react-router-dom";

const MovieDetailsPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const release_date = queryParams.get("release_date");

  const [userId, setUserId] = useState(null);           // ← new
  const [movie, setMovie] = useState(null);
  const [posterURL, setPosterURL] = useState(null);
  const [backdropURL, setBackdropURL] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [loadingAdd, setLoadingAdd] = useState(false);
  const [message, setMessage] = useState(null);

  // dropdown & form states
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showWatchedForm, setShowWatchedForm] = useState(false);
  const [watchedRating, setWatchedRating] = useState("");
  const [watchedReview, setWatchedReview] = useState("");

  const [enhancedPlot, setEnhancedPlot] = useState(null);
  const [loadingPlot, setLoadingPlot] = useState(false);
  const hasEnhancedPlot = useRef(false);

  // ---- fetch current user ID on mount ----
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const resp = await fetch("http://localhost:8000/user_info/", {
          credentials: "include",
        });
        if (!resp.ok) throw new Error("Failed to fetch user info");
        const js = await resp.json();
        setUserId(js.id);
      } catch (e) {
        console.error("user_info error:", e);
      }
    };
    fetchUser();
  }, []);

  // 1) Fetch OMDB info, then local DB ID
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
        const resp = await fetch(
          `http://localhost:8000/search/?filter=movie&q=${encodeURIComponent(title)}&year=${encodeURIComponent(year)}`
        );
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

  // 2) Fetch backdrop
  const fetchBackdrop = async title => {
    try {
      const resp = await fetch(
        `http://localhost:8000/movie_backdrop/?title=${encodeURIComponent(title)}`
      );
      const d = await resp.json();
      if (d.backdrop) setBackdropURL(d.backdrop);
    } catch (e) {
      console.error("Backdrop fetch failed", e);
    }
  };

  // 3) Fetch poster
  useEffect(() => {
    if (!movie) return;
    (async () => {
      try {
        const resp = await fetch(
          `http://localhost:8000/movie_poster/?title=${encodeURIComponent(movie.title)}`
        );
        const d = await resp.json();
        if (d.poster) setPosterURL(d.poster);
      } catch (e) {
        console.error("Poster fetch failed", e);
      }
    })();
  }, [movie]);

  // 4) Enhance plot via AI
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

  // 5) Add to watchlist
  const addToWatchlist = async () => {
    setLoadingAdd(true);
    try {
      const idToSend = movie.db_id || movie.id;
      const resp = await fetch(
        `http://localhost:8000/add_movie/?movie_id=${idToSend}`,
        { credentials: "include" }
      );
      const d = await resp.json();
      setMessage({ text: d.message || "Added to watchlist", type: "success" });
    } catch (e) {
      console.error(e);
      setMessage({ text: "Failed to add to watchlist", type: "error" });
    } finally {
      setLoadingAdd(false);
      setShowAddMenu(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 6) Add to watched (now uses userId)
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
          user_id: userId,                 // ← use real userId
          movie_id: idToSend,
          rating: parseInt(watchedRating, 10),
          review: watchedReview
        }),
      });
      const d = await resp.json();
      setMessage({ text: d.message, type: resp.ok ? "success" : "error" });
    } catch (e) {
      console.error(e);
      setMessage({ text: "Failed to mark watched", type: "error" });
    } finally {
      setLoadingAdd(false);
      setShowWatchedForm(false);
      setShowAddMenu(false);
      setWatchedRating("");
      setWatchedReview("");
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) return <div style={styles.loading}>Loading…</div>;
  if (error)   return <div style={styles.error}>Error: {error}</div>;

  return (
    <div style={{ ...styles.container, backgroundImage: backdropURL ? `url(${backdropURL})` : undefined }}>
      <div style={styles.backdropOverlay} />

      {message && (
        <div style={{ ...styles.message, backgroundColor: message.type === "success" ? "#4caf50" : "#f44336" }}>
          {message.text}
        </div>
      )}

      <div style={styles.detailsWrapper}>
        <div style={styles.posterContainer}>
          <img src={posterURL || "https://via.placeholder.com/300x450"} alt={movie.title} style={styles.poster} />

          <button
            style={styles.addButton}
            onClick={() => { setShowAddMenu(s => !s); setShowWatchedForm(false); }}
            disabled={loadingAdd}
          >
            {loadingAdd ? "…" : "+"}
          </button>

          {showAddMenu && (
            <div className="add-menu">
              {!showWatchedForm ? (
                <>
                  <button onClick={addToWatchlist}>Add to Watchlist</button>
                  <button onClick={() => setShowWatchedForm(true)}>Mark as Watched</button>
                </>
              ) : (
                <div className="watched-form">
                  <label>
                    Rating:
                    <select value={watchedRating} onChange={e => setWatchedRating(e.target.value)} required>
                      <option value="">Select</option>
                      {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <label>
                    Review:
                    <textarea value={watchedReview} onChange={e => setWatchedReview(e.target.value)} maxLength={2000} />
                  </label>
                  <button onClick={addToWatched} disabled={loadingAdd}>{loadingAdd ? "…" : "Submit"}</button>
                  <button onClick={() => { setShowWatchedForm(false); setWatchedRating(''); setWatchedReview(''); }}>Cancel</button>
                </div>
              )}
            </div>
          )}
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

      <style>{`
        .add-menu {
          position: absolute;
          top: 60px;
          right: 15px;
          background: #240046;
          border: 1px solid #7d00ff;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.6);
          z-index: 10;
        }
        .add-menu button {
          display: block;
          width: 100%;
          padding: 10px 16px;
          background: none;
          border: none;
          color: #fff;
          text-align: left;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.2s;
        }
        .add-menu button:hover { background: rgba(125,0,255,0.4); }
        .watched-form { display: flex; flex-direction: column; padding: 12px; }
        .watched-form label { color: #fff; font-size: 1rem; margin-bottom: 8px; }
        .watched-form select, .watched-form textarea { margin-top: 4px; padding: 6px; border-radius: 4px; border: none; font-size: 1rem; width: 100%; }
        .watched-form textarea { resize: vertical; min-height: 60px; }
        .watched-form button { margin-top: 8px; padding: 8px; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; }
        .watched-form button:first-of-type { background: #7d00ff; color: #fff; }
        .watched-form button:last-of-type { background: #444; color: #fff; }
      `}</style>
    </div>
  );
};

const styles = {
  container: { position: "relative", padding: "40px 20px", color: "#fff", backgroundColor: "#240046", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", minHeight: "100vh" },
  backdropOverlay: { position: "absolute", inset: 0, background: "rgba(36,0,70,0.85)", zIndex: 0 },
  loading: { color: "#fff", textAlign: "center", padding: "40px", fontSize: "1.2rem" },
  error: { color: "#ff6b6b", textAlign: "center", padding: "40px", fontSize: "1.2rem" },
  message: { padding: "15px", margin: "0 auto 20px", color: "#fff", borderRadius: "4px", textAlign: "center", maxWidth: "80%", position: "relative", zIndex: 1 },
  detailsWrapper: { display: "flex", gap: "40px", alignItems: "flex-start", maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 1 },
  posterContainer: { position: "relative", width: "300px", flexShrink: 0, borderRadius: "8px", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.6)" },
  poster: { width: "100%", display: "block" },
  addButton: { position: "absolute", top: "15px", right: "15px", backgroundColor: "#7d00ff", border: "none", color: "#fff", cursor: "pointer", fontSize: "24px", width: "40px", height: "40px", borderRadius: "50%", boxShadow: "0 2px 6px rgba(0,0,0,0.3)", transition: "background 0.2s" },
  info: { flex: 1 },
  title: { margin: "0 0 15px", fontSize: "2.5rem", color: "#fff" },
  metaBadges: { marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "10px" },
  badge: { backgroundColor: "rgba(255,255,255,0.2)", padding: "6px 12px", borderRadius: "4px", fontSize: "0.9rem" },
  sectionTitle: { fontSize: "1.5rem", marginBottom: "15px", color: "#e0aaff" },
  plotLoading: { color: "#adb5bd", fontStyle: "italic", marginBottom: "25px" },
  plotText: { lineHeight: "1.6", marginBottom: "25px", fontSize: "1.1rem" },
  link: { color: "inherit", textDecoration: "none" },
};

export default MovieDetailsPage;
