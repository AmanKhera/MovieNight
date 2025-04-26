// src/components/thecomponents.jsx
import React, { useState, useEffect} from "react";
import { useNavigate } from "react-router-dom";

/** ========== GROUPS SIDEBAR ========== */

// Helper to read a named cookie (e.g., "csrftoken").
const getCookie = (name) => {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

export const GroupsSidebar = ({ selectedGroup, onSelectGroup }) => {
  // === State ===
  const [leaderId, setLeaderId] = useState(null);            // from /user_info/
  const [username, setUsername] = useState("");              // for get_user_groups
  const [userGroups, setUserGroups] = useState([]);           // fetched groups
  const [groupName, setGroupName] = useState("");
  const [genre, setGenre] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);             // toggle modal

  // Member management modal state
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [addMemberId, setAddMemberId] = useState("");
  const [removeMemberId, setRemoveMemberId] = useState("");

  // 1) Fetch user info
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:8000/user_info/", { credentials: "include" });
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error || "Failed to fetch user info");
        } else {
          setLeaderId(data.id);
          setUsername(data.username);
        }
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  // 2) Fetch user groups when username is set
  useEffect(() => {
    if (!username) return;
    (async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/get_user_groups/?username=${username}`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error || "Failed to fetch user groups");
        } else {
          setUserGroups(data.groups || []);
        }
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [username]);

  // 3) Create a new group
  const handleCreateGroup = async () => {
    try {
      const csrfToken = getCookie("csrftoken");
      if (!csrfToken) {
        console.error("CSRF token not found");
        return;
      }
      const response = await fetch("http://localhost:8000/create_group/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          group_name: groupName,
          leader_id: leaderId,
          genre: genre,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create group");
      }

      const data = await response.json();
      console.log("Group created:", data.message);

      // Refresh group list
      const res = await fetch(
        `http://localhost:8000/get_user_groups/?username=${username}`,
        { credentials: "include" }
      );
      const newData = await res.json();
      setUserGroups(newData.groups || []);

      // Reset form and close modal
      setGroupName("");
      setGenre("");
      setShowForm(false);
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };

  // 4) Add a member to a group
  const handleAddMember = async (group_id) => {
    try {
      const csrfToken = getCookie("csrftoken");
      if (!csrfToken) {
        console.error("CSRF token not found");
        return;
      }
      const response = await fetch("http://localhost:8000/add_members/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          group_id: group_id,
          member_id: addMemberId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to add member");
      }
      console.log("Member added:", data.message);
      alert(data.message);
      setAddMemberId("");
    } catch (error) {
      console.error("Error adding member:", error);
      alert(error);
    }
  };

  // 5) Remove a member from a group
  const handleRemoveMember = async (group_id) => {
    try {
      const csrfToken = getCookie("csrftoken");
      if (!csrfToken) {
        console.error("CSRF token not found");
        return;
      }
      const response = await fetch("http://localhost:8000/remove_member/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          group_id: group_id,
          remove_id: removeMemberId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to remove member");
      }
      console.log("Member removed:", data);
      alert("User has been removed from the group");
      setRemoveMemberId("");
    } catch (error) {
      console.error("Error removing member:", error);
      alert(error);
    }
  };

  // === Styling ===
  const sidebarStyle = {
    width: "15%",
    padding: "1rem",
    boxSizing: "border-box",
    color: "white",
    backgroundColor: "#1a0133",
  };

  const headerFlexStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "1rem",
  };

  const plusButtonStyle = {
    backgroundColor: "#6a0dad",
    color: "#fff",
    border: "none",
    padding: "0.5rem 0.75rem",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "1.2rem",
  };

  const memberButtonStyle = {
    backgroundColor: "#6a0dad",
    color: "#fff",
    border: "none",
    padding: "0.35rem 0.5rem",
    cursor: "pointer",
    borderRadius: "50%",
    marginLeft: "0.5rem",
    fontSize: "0.9rem",
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
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  });

  const modalOverlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  };

  const modalContentStyle = {
    backgroundColor: "#fff",
    padding: "1rem",
    borderRadius: "4px",
    width: "300px",
    maxWidth: "90%",
    color: "#000",
    position: "relative",
  };

  const closeButtonStyle = {
    backgroundColor: "transparent",
    border: "none",
    fontSize: "1.2rem",
    cursor: "pointer",
    position: "absolute",
    right: "0.5rem",
    top: "0.5rem",
  };

  const memberModalOverlayStyle = {
    ...modalOverlayStyle,
    zIndex: 1100,
  };

  const memberModalContentStyle = {
    ...modalContentStyle,
    width: "300px",
    maxWidth: "90%",
  };

  return (
    <div style={sidebarStyle}>
      <div style={headerFlexStyle}>
        <h3 style={{ margin: 0 }}>My Groups</h3>
        <button onClick={() => setShowForm(true)} style={plusButtonStyle}>
          +
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <ul style={listStyle}>
        {userGroups.map((grp) => (
          <li
            key={grp.group_id}
            style={listItemStyle(
              selectedGroup && grp.group_name === selectedGroup.group_name
            )}
            onClick={() => onSelectGroup(grp)}
          >
            <span>{grp.group_name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpandedGroupId(grp.group_id);
              }}
              style={memberButtonStyle}
            >
              ...
            </button>
          </li>
        ))}
      </ul>

      {expandedGroupId && (
        <div style={memberModalOverlayStyle}>
          <div style={memberModalContentStyle}>
            <button onClick={() => setExpandedGroupId(null)} style={closeButtonStyle}>
              ×
            </button>
            <h4 style={{ margin: "0 0 0.5rem 0" }}>
              Manage Members for{" "}
              {userGroups.find((g) => g.group_id === expandedGroupId)?.group_name ||
                "Group"}
            </h4>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>Add Member:</strong>
              <input
                type="text"
                placeholder="Member ID"
                value={addMemberId}
                onChange={(e) => setAddMemberId(e.target.value)}
                style={{ marginLeft: "0.5rem", width: "60%" }}
              />
              <button
                onClick={() => handleAddMember(expandedGroupId)}
                style={{ marginLeft: "0.5rem" }}
              >
                Add
              </button>
            </div>
            <div>
              <strong>Remove Member:</strong>
              <input
                type="text"
                placeholder="Member ID"
                value={removeMemberId}
                onChange={(e) => setRemoveMemberId(e.target.value)}
                style={{ marginLeft: "0.5rem", width: "60%" }}
              />
              <button
                onClick={() => handleRemoveMember(expandedGroupId)}
                style={{ marginLeft: "0.5rem" }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <button onClick={() => setShowForm(false)} style={closeButtonStyle}>
              ×
            </button>
            <h4>Create New Group</h4>
            <input
              type="text"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{ marginBottom: "0.5rem", width: "100%" }}
            />
            <input
              type="text"
              placeholder="Genre (optional)"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              style={{ marginBottom: "0.5rem", width: "100%" }}
            />
            <button onClick={handleCreateGroup}>Create Group</button>
          </div>
        </div>
      )}
    </div>
  );
};

/** ========== CHAT SECTION ========== */
export const ChatSection = ({ selectedGroup }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

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
    overflowY: "auto",
    padding: "1rem",
  };

  const chatInputAreaStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    borderTop: "1px solid #ccc",
    padding: "0.5rem",
  };

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
          console.error("Error fetching user info:", data.error);
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };
    fetchUserInfo();
  }, []);

  const fetchMessages = async () => {
    if (!selectedGroup) return;
    try {
      const response = await fetch(
        `http://localhost:8000/group_messages/?group_id=${selectedGroup.group_id}`,
        { credentials: "include" }
      );
      const data = await response.json();
      if (response.ok) {
        // Reverse the messages array to show newest at the bottom
        setMessages(data.messages ? [...data.messages].reverse() : []);
      } else {
        console.error("Retrieve error:", data.error);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error retrieving messages:", error);
      setMessages([]);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedGroup || !newMessage || !currentUser) return;
    try {
      const csrfToken = getCookie("csrftoken");
      const response = await fetch("http://localhost:8000/send_message/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          user_sending: currentUser.id,
          user_recieving: selectedGroup.group_id,
          message: newMessage,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        console.log("Message sent:", data.Success);
        setNewMessage("");
        fetchMessages();
      } else {
        console.error("Send error:", data.error);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  useEffect(() => {
    if (selectedGroup) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedGroup]);

  return (
    <div style={chatStyle}>
      <div style={chatHeaderStyle}>
        <h3>{selectedGroup ? selectedGroup.group_name : "Select a Group"}</h3>
      </div>

      <div style={messagesContainerStyle}>
        {/* Render messages in reversed order */}
        {messages.map((msg, idx) => (
          <div key={idx} style={{ marginBottom: "0.5rem" }}>
            <strong>
              {typeof msg.user_sending === "number" &&
              currentUser &&
              msg.user_sending === currentUser.id
                ? currentUser.username
                : msg.user_sending}
              :
            </strong>{" "}
            {msg.message_content}
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
        <button onClick={handleSendMessage}>➤</button>
      </div>
    </div>
  );
};

/** ========== GROUP RECOMMENDATION (MOVIE POLL) ========== */
/** ========== GROUP RECOMMENDATION (MOVIE POLL) ========== */
export const MoviePoll = ({ selectedGroup }) => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchMovieDetails = async (title) => {
    try {
      // First search for the movie by title
      const searchResponse = await fetch(
        `http://localhost:8000/search/?q=${encodeURIComponent(title)}&filter=movie`
      );
      const searchData = await searchResponse.json();
      
      if (!searchData.movies || searchData.movies.length === 0) return null;
      const movie = searchData.movies[0];

      // Then get the poster
      const posterResponse = await fetch(
        `http://localhost:8000/movie_poster/?title=${encodeURIComponent(title)}`
      );
      const posterData = await posterResponse.json();

      return {
        id: movie.id,
        title: movie.title,
        year: movie.year,
        poster: posterData.poster,
        plot: movie.plot,
        director: movie.director,
        runtime: movie.runtime,
        rating: movie.rating
      };
    } catch (error) {
      console.error("Error fetching movie details:", error);
      return null;
    }
  };

  useEffect(() => {
    if (!selectedGroup?.group_id) return;

    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const csrfToken = getCookie("csrftoken");
        const resp = await fetch(`http://localhost:8000/movie_rec/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
          body: JSON.stringify({
            user_id: selectedGroup.group_id
          }),
        });

        if (!resp.ok) throw new Error("Failed to fetch recommendations");
        
        const data = await resp.json();
        const parsedSummary = JSON.parse(data.summary);
        const movieTitles = parsedSummary.recommendations;

        // Fetch details for all movies in parallel
        const movieDetails = await Promise.all(
          movieTitles.map(title => fetchMovieDetails(title))
        );

        // Filter out null results and format
        const validMovies = movieDetails.filter(movie => movie !== null).map(movie => ({
          id: movie.id,
          title: movie.title,
          year: movie.year,
          poster: movie.poster,
          plot: movie.plot,
          director: movie.director,
          runtime: movie.runtime,
          rating: movie.rating
        }));

        setRecommendations(validMovies);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [selectedGroup?.group_id]);

  const handleMovieClick = (movie) => {
    const titleParam = encodeURIComponent(
      movie.title || movie.original_title
    );
    const releaseDate = movie.year;
    navigate(
      releaseDate
        ? `/movie/${titleParam}?release_date=${encodeURIComponent(
            releaseDate
          )}`
        : `/movie/${titleParam}`
    );
  };


  // Styling (same as previous)
  const pollStyle = {
    width: "30%",
    color: "white",
    backgroundColor: "#1a0133",
    padding: "1rem",
    overflowY: "auto",
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: "1rem",
    padding: "0.5rem",
  };

  const movieCardStyle = {
    cursor: "pointer",
    borderRadius: "8px",
    overflow: "hidden",
    backgroundColor: "#240046",
    transition: "transform 0.2s",
    ":hover": {
      transform: "scale(1.05)",
    },
  };

  const imageStyle = {
    width: "100%",
    height: "200px",
    objectFit: "cover",
  };

  return (
    <div style={pollStyle}>
      <h3>Group Recommendations</h3>
      {loading && <p>Loading recommendations...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={gridStyle}>
        {recommendations.map((movie) => (
          <div 
            key={movie.id}
            style={movieCardStyle}
            onClick={() => handleMovieClick(movie)}
          >
            <img
              src={movie.poster || "https://via.placeholder.com/150x200?text=No+Poster"}
              alt={movie.title}
              style={imageStyle}
            />
            <div style={{ padding: "0.5rem" }}>
              <div style={{ fontWeight: "bold" }}>{movie.title}</div>
              {movie.year && (
                <div style={{ fontSize: "0.8rem", color: "#ccc" }}>
                  ({movie.year})
                </div>
              )}
              {movie.rating && (
                <div style={{ fontSize: "0.8rem", color: "#ccc" }}>
                  Rating: {movie.rating}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
/** ========== USER PROFILE ========== */
export const UserProfile = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch("http://localhost:8000/user_info/", {
          credentials: "include",
        });
        if (!response.ok) {
          const errorData = await response.json();
          setErrorMessage(errorData.error || "Unknown error");
          return;
        }
        const data = await response.json();
        if (data.error) {
          setErrorMessage(data.error);
        } else {
          setUserInfo(data);
        }
      } catch (error) {
        setErrorMessage(error.toString());
      }
    };

    fetchUserInfo();
  }, []);

  const containerStyle = {
    marginTop: "1rem",
    padding: "1rem",
    backgroundColor: "#240046",
    color: "white",
    borderRadius: "4px",
  };

  if (errorMessage) {
    return (
      <div style={containerStyle}>
        <h3>User Info</h3>
        <p style={{ color: "red" }}>{errorMessage}</p>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div style={containerStyle}>
        <h3>User Info</h3>
        <p>Loading user info...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h3>User Info</h3>
      <p>
        <strong>ID:</strong> {userInfo.id}
      </p>
      <p>
        <strong>Username:</strong> {userInfo.username}
      </p>
      <p>
        <strong>Email:</strong> {userInfo.email}
      </p>
      <p>
        <strong>Date Joined:</strong>{" "}
        {new Date(userInfo.date_joined).toLocaleString()}
      </p>
    </div>
  );
};

/** ========== USER USERNAME ========== */
export const UserUsername = () => {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch("http://localhost:8000/user_info/", {
          credentials: "include",
        });
        const data = await response.json();
        if (response.ok) {
          setUserId(data.id);
        } else {
          setError(data.error || "Failed to fetch user info");
        }
      } catch (err) {
        setError(err.message);
      }
    };

    fetchUserInfo();
  }, []);

  useEffect(() => {
    if (userId) {
      const fetchUsername = async () => {
        try {
          const response = await fetch(
            `http://localhost:8000/frontend_username/?user_id=${userId}`,
            { credentials: "include" }
          );
          const data = await response.json();
          if (response.ok) {
            setUsername(data.Username);
          } else {
            setError(data.Failure || "Failed to fetch username");
          }
        } catch (err) {
          setError(err.message);
        }
      };

      fetchUsername();
    }
  }, [userId]);

  const containerStyle = {
    marginTop: "1rem",
    padding: "1rem",
    backgroundColor: "#240046",
    color: "white",
    borderRadius: "4px",
  };

  return (
    <div style={containerStyle}>
      <h3>User Username</h3>
      {error ? <p style={{ color: "red" }}>{error}</p> : <p>{username}</p>}
    </div>
  );
};