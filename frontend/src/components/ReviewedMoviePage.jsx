// src/pages/ReviewedMoviesPage.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUserInfo, fetchRecentlyWatched, fetchMoviePoster } from "../api";

const ReviewedMoviesPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1) get user info
  const {
    data: userInfo,
    isLoading: userLoading,
    isError: userError,
    error: userErrorMsg,
  } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo,
    staleTime: Infinity,
  });

  // 2) get reviewed movies once we know the user ID
  const {
    data: reviews,
    isLoading: reviewsLoading,
    isError: reviewsError,
    error: reviewsErrorMsg,
  } = useQuery({
    queryKey: ['reviewedMovies', userInfo?.id],
    queryFn: () => fetchRecentlyWatched(userInfo.id),
    enabled: Boolean(userInfo?.id),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });


  // 3) as soon as reviews arrive, prefetch each movie's poster
  useEffect(() => {
    if (!reviews) return;
    reviews.forEach((r) => {
      queryClient.prefetchQuery({
        queryKey: ['moviePoster', r.title],
        queryFn: () => fetchMoviePoster(r.title),
        staleTime: Infinity,
      });
    });
  }, [reviews, queryClient]);

  if (userLoading || reviewsLoading) {
    return <div style={styles.loading}>Loading your reviews…</div>;
  }
  if (userError) {
    return <div style={styles.error}>Error: {userErrorMsg.message}</div>;
  }
  if (reviewsError) {
    return <div style={styles.error}>Error: {reviewsErrorMsg.message}</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.pageTitle}>My Rated Movies</h1>
      <div style={styles.grid}>

        {console.log("REVIEWS ARE " + reviews)}
        
        {reviews.map((r) => (
          <div
            key={`${r.title}-${r.date_watched}`}
            style={styles.card}
            className="movie-card"
            onClick={() =>
              navigate(`/movie/${encodeURIComponent(r.title)}`)
            }
          >
            <img
              src={r.poster || "https://via.placeholder.com/150x225"}
              alt={r.title}
              style={styles.poster}
            />
            <div style={styles.info}>
              <h2 style={styles.title}>{r.title}</h2>
              <div style={styles.stars}>
                {[...Array(5)].map((_, i) => (i < r.user_rating ? "★" : "☆"))}
              </div>
              <p style={styles.reviewText}>{r.review}</p>
              <p style={styles.dateText}>
                Watched on {" "}
                {new Date(r.date_watched).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        a { text-decoration: none; color: inherit; }
        .movie-card:hover { transform: scale(1.02); }
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
  },
  stars: {
    margin: "8px 0",
    fontSize: "1.2rem",
    color: "#ffcc00",
    lineHeight: 1,
  },
  reviewText: {
    flexGrow: 1,
    color: "#e0e0e0",
    marginBottom: "12px",
    fontSize: "1rem",
    lineHeight: 1.4,
  },
  dateText: {
    fontSize: "0.9rem",
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
