import React, { useState, useEffect } from "react";

// Inline CSS for this component
const usernameDisplayCSS = `
  .username-display {
    margin: 20px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .movie-night-title {
    font-size: 2rem;
    font-weight: bold;
    color: white;
    margin-bottom: 10px;
  }

  .avatar-and-username {
    display: flex;
    align-items: center;
  }

  .avatar {
    width: 60px;
    height: 60px;
    background-color: #555; /* or your preferred color/placeholder image */
    border-radius: 50%;
    margin-right: 10px;
  }

  .username-text {
    color: white;
    font-size: 1.2rem;
    font-weight: bold;
  }
`;

const UsernameDisplay = () => {
  const [username, setUsername] = useState("Username");

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const response = await fetch("http://localhost:8000/user_info/", {
          credentials: "include",
        });
        const data = await response.json();
        if (response.ok && data.username) {
          setUsername(data.username);
        }
      } catch (err) {
        console.error("Error fetching username:", err);
        // Leave username as "Username"
      }
    };

    fetchUsername();
  }, []);

  return (
    <div className="username-display">
      <style>{usernameDisplayCSS}</style>
      <div className="avatar-and-username">
        <div className="avatar" />
        <div className="username-text">@{username}</div>
      </div>
    </div>
  );
};

export default UsernameDisplay;
