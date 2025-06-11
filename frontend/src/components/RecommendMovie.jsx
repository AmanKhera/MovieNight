import React, { useState, useEffect } from "react";

const RecommendMovie = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch("http://localhost:8000/user_info/", {
          credentials: "include",
        });
        const data = await response.json();
        if (response.ok) {
          setCurrentUser({ id: data.id, username: data.username });
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError(err.message);
      }
    };

    fetchUserInfo();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const fetchRecommendations = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/group_recommendation/?group_id=${currentUser.id}`,
          { credentials: "include" }
        );
        const data = await response.json();
        if (response.ok && data.Recommendations) {
          setRecommendations(data.Recommendations);
        } else {
          setError(data.error || "Failed to fetch recommendations.");
        }
      } catch (err) {
        setError(err.message);
      }
    };

    fetchRecommendations();
  }, [currentUser]);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Group Recommendations</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div style={styles.recommendationList}>
        {recommendations.length > 0 ? (
          recommendations.map((rec) => (
            <div key={rec.id} style={styles.recommendationCard}>
              <h3>
                {rec.movie_id
                  ? `Movie ID: ${rec.movie_id}`
                  : "Movie ID not provided"}
              </h3>
              <p>
                <strong>Suggested by:</strong> {rec.member_suggested}
              </p>
              <p>
                <strong>Votes:</strong> {rec.voting || 0}
              </p>
            </div>
          ))
        ) : (
          <p>No recommendations available.</p>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: "20px",
    backgroundColor: "#1D0037",
    color: "#fff",
    borderRadius: "8px",
    width: "300px",
    margin: "20px auto",
  },
  title: {
    textAlign: "center",
    marginBottom: "10px",
  },
  recommendationList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  recommendationCard: {
    backgroundColor: "#240046",
    padding: "10px",
    borderRadius: "4px",
  },
};

export default RecommendMovie;