// src/components/thecomponents.jsx
import React, { useState, useEffect } from "react";

/** ========== GROUPS SIDEBAR ========== */
export const GroupsSidebar = ({ groups, selectedGroup, onSelectGroup }) => {
  const sidebarStyle = {
    width: "15%",
    padding: "1rem",
    boxSizing: "border-box",
    color: "white",
    backgroundColor: "#1a0133",
  };

  const listStyle = {
    listStyle: "none",
    margin: 0,
    padding: 0,
  };

  const listItemStyle = (active) => ({
    padding: "1rem",
    marginBottom: "0.5rem",
    backgroundColor: active ? "#240046" : "transparent",
    cursor: "pointer",
    borderRadius: "4px",
  });

  return (
    <div style={sidebarStyle}>
      <h3>My Groups</h3>
      <ul style={listStyle}>
        {groups.map((group) => (
          <li
            key={group}
            style={listItemStyle(group === selectedGroup)}
            onClick={() => onSelectGroup(group)}
          >
            {group}
          </li>
        ))}
      </ul>
    </div>
  );
};

/** ========== CHAT SECTION ========== */
export const ChatSection = ({
  selectedGroup,
  messages,
  newMessage,
  setNewMessage,
  onSendMessage,
}) => {
  const chatStyle = {
    width: "55%",
    display: "flex",
    flexDirection: "column",
    color: "white",
    backgroundColor: "#2a0252",
  };

  const chatHeaderStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.75rem 1rem",
    color: "white",
    backgroundColor: "#240046",
  };

  const messagesContainerStyle = {
    flex: 1,
    overflowY: "auto", // internal scroll for messages
    padding: "1rem",
  };

  const chatInputAreaStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    borderTop: "1px solid #ccc",
    padding: "0.5rem",
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      onSendMessage();
    }
  };

  return (
    <div style={chatStyle}>
      <div style={chatHeaderStyle}>
        <h3>{selectedGroup}</h3>
        {/* Example: group member icons */}
        <div style={{ display: "flex", gap: "0.5rem" }}></div>
      </div>

      <div style={messagesContainerStyle}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ marginBottom: "0.5rem" }}>
            <strong>{msg.sender}:</strong> {msg.text}
          </div>
        ))}
      </div>

      <div style={chatInputAreaStyle}>
        <input
          style={{ flex: 1, padding: "0.5rem" }}
          type="text"
          placeholder="Type message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={onSendMessage}>➤</button>
      </div>
    </div>
  );
};

/** ========== MOVIE POLL ========== */
export const MoviePoll = () => {
  const [movies, setMovies] = useState([]);

  // On mount, fetch the popular movies from your local Django backend
  useEffect(() => {
    const fetchPopularMovies = async () => {
      try {
        const response = await fetch("http://localhost:8000/popular_movie/");
        if (!response.ok) {
          throw new Error(`Failed to fetch popular movies: ${response.status}`);
        }
        const data = await response.json();
        // 'data.results' should be an array from TMDB
        setMovies(data.results || []);
      } catch (error) {
        console.error("Error fetching popular movies:", error);
      }
    };

    fetchPopularMovies();
  }, []);

  // "Vote" means increment a local 'votes' count
  const handleVote = (movieId) => {
    setMovies((prevMovies) =>
      prevMovies.map((movie) =>
        movie.id === movieId
          ? { ...movie, votes: (movie.votes || 0) + 1 }
          : movie
      )
    );
  };

  const pollStyle = {
    width: "30%",
    color: "white",
    backgroundColor: "#1a0133",
    padding: "1rem",
    overflowY: "auto",
    boxSizing: "border-box",
  };

  const pollItemsStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  };

  const pollItemStyle = {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    borderRadius: "4px",
    padding: "0.75rem",
    color: "white",
    backgroundColor: "#240046",
  };

  const posterStyle = {
    width: 60,
    height: 90,
    backgroundColor: "#ddd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    color: "#666",
    fontSize: "0.8rem",
  };

  // Changed here: styling the Vote button purple
  const voteButtonStyle = {
    backgroundColor: "#6a0dad",
    color: "#fff",
    border: "none",
    padding: "0.5rem 1rem",
    borderRadius: "4px",
    cursor: "pointer",
  };

  return (
    <div style={pollStyle}>
      <h3>Movie Poll</h3>
      <div style={pollItemsStyle}>
        {movies.map((movie) => (
          <div key={movie.id} style={pollItemStyle}>
            {/* Poster */}
            <div style={posterStyle}>
              {movie.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                  alt={movie.title}
                  style={{ width: "60px", height: "90px", borderRadius: "4px" }}
                />
              ) : (
                <span>No Poster</span>
              )}
            </div>

            {/* Title & Votes */}
            <div>
              <div style={{ fontWeight: "bold" }}>{movie.title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button style={voteButtonStyle} onClick={() => handleVote(movie.id)}>
                  Vote
                </button>
                <span>{movie.votes || 0} votes</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
