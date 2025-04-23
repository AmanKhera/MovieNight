// src/pages/ReviewedMoviesPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const ReviewedMoviesPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1) get current user ID
        const userResp = await fetch("http://localhost:8000/user_info/", {
          credentials: "include",
        });
        if (!userResp.ok) throw new Error("Failed to get user info");
        const userJson = await userResp.json();
        const userId = userJson.id;

        // 2) fetch watched list for that user
        const resp = await fetch(
          `http://localhost:8000/recently_watched/?user_id=${userId}`,
          { credentials: "include" }
        );
        if (!resp.ok) throw new Error("Could not load watched movies");
        const data = await resp.json();

        // 3) enrich each entry with poster_url
        const enriched = await Promise.all(
          data.map(async (r) => {
            try {
              const p = await fetch(
                `http://localhost:8000/movie_poster/?title=${encodeURIComponent(
                  r.title
                )}`
              );
              const pj = await p.json();
              return { ...r, poster_url: pj.poster || null };
            } catch {
              return { ...r, poster_url: null };
            }
          })
        );

        setReviews(enriched);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div style={styles.loading}>Loading your reviews…</div>;
  if (error)   return <div style={styles.error}>Error: {error}</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.pageTitle}>My Rated Movies</h1>
      <div style={styles.list}>
        {reviews.map((r) => (
          <div
            key={`${r.movie}-${r.date_watched}`}
            className="review-row"
            style={styles.row}
            onClick={() =>
              navigate(`/movie/${encodeURIComponent(r.title)}`)
            }
          >
            <img
              src={r.poster_url || "https://via.placeholder.com/150x225"}
              alt={r.title}
              style={styles.poster}
            />
            <div style={styles.info}>
              <h2 style={styles.title}>{r.title}</h2>
              <div style={styles.stars}>
                {[...Array(5)].map((_, i) =>
                  i < r.rating ? "★" : "☆"
                )}
              </div>
              <p style={styles.reviewText}>{r.review}</p>
              <p style={styles.dateText}>
                Watched on {new Date(r.date_watched).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
      {/* small reset for links, if any */}
      <style>{`
        a { text-decoration: none; color: inherit }
        .review-row:hover { transform: scale(1.02); }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: "#240046",
    minHeight: "100vh",
    padding: "60px 40px",
    color: "#fff",
  },
  pageTitle: {
    fontSize: "3rem",
    marginBottom: "40px",
    textAlign: "center",
  },
  list: {
    width: "100%",
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "30px",
  },
  row: {
    width: "100%",
    display: "flex",
    backgroundColor: "rgba(36,0,70,0.95)",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 6px 16px rgba(0,0,0,0.6)",
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  poster: {
    width: "150px",
    height: "225px",
    objectFit: "cover",
    flexShrink: 0,
  },
  info: {
    padding: "20px 30px",
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  title: {
    margin: 0,
    fontSize: "2rem",
  },
  stars: {
    margin: "12px 0",
    fontSize: "1.6rem",
    color: "#ffcc00",
    lineHeight: 1,
  },
  reviewText: {
    flexGrow: 1,
    color: "#e0e0e0",
    marginBottom: "12px",
    fontSize: "1.1rem",
    lineHeight: 1.5,
  },
  dateText: {
    fontSize: "1rem",
    color: "#aaa",
  },
  loading: {
    textAlign: "center",
    padding: "80px",
    fontSize: "1.4rem",
  },
  error: {
    textAlign: "center",
    padding: "80px",
    fontSize: "1.4rem",
    color: "#ff6b6b",
  },
};

export default ReviewedMoviesPage;
