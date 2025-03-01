import React, { useState, useEffect } from "react";

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
  const [leaderId, setLeaderId] = useState(null); // from /user_info/ (used for creating groups)
  const [userGroups, setUserGroups] = useState([]); // from /get_user_groups/
  const [groupName, setGroupName] = useState("");
  const [genre, setGenre] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false); // toggle for creating a new group

  // State for per‑group member management modal
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [addMemberId, setAddMemberId] = useState("");
  const [removeMemberId, setRemoveMemberId] = useState("");

  // Insert keyframes for modal fadeIn animation (only once)
  useEffect(() => {
    if (!document.getElementById("modal-keyframes")) {
      const style = document.createElement("style");
      style.id = "modal-keyframes";
      style.innerHTML = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // 1) Fetch user info (to get leaderId)
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch("http://localhost:8000/user_info/", {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch user info");
        }
        const data = await response.json();
        console.log("User info response:", data);
        if (data.error) {
          setError(data.error);
        } else {
          setLeaderId(data.id);
        }
      } catch (err) {
        setError(err.message);
      }
    };
    fetchUserInfo();
  }, []);

  // 2) Fetch user groups
  const fetchUserGroups = async () => {
    try {
      const response = await fetch("http://localhost:8000/get_user_groups/", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch user groups");
      }
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setUserGroups(data.groups || []);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchUserGroups();
  }, []);

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
      fetchUserGroups();
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
      const response = await fetch(
        "http://localhost:8000/remove_member_from_group/",
        {
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
        }
      );
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

  // Header container using flex for the "My Groups" header and header plus button (for creating new groups)
  const headerFlexStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "1rem",
  };

  // Button style for the header plus button (for creating a new group)
  const plusButtonStyle = {
    backgroundColor: "#6a0dad",
    color: "#fff",
    border: "none",
    padding: "0.5rem 0.75rem",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "1.2rem",
  };

  // Style for the per‑group member management plus button
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

  // List and list-item styling
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

  // Modal overlay and content styles for the Create Group pop-up
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
    animation: "fadeIn 0.5s ease-out",
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

  // Modal overlay and content styles for the Member Management pop-up (reusing similar styles)
  const memberModalOverlayStyle = {
    ...modalOverlayStyle,
    zIndex: 1100, // Ensure it's above the create group modal if needed
  };

  const memberModalContentStyle = {
    ...modalContentStyle,
    width: "300px",
    maxWidth: "90%",
  };

  return (
    <div style={sidebarStyle}>
      {/* Header: "My Groups" with header plus button for creating new groups */}
      <div style={headerFlexStyle}>
        <h3 style={{ margin: 0 }}>My Groups</h3>
        <button onClick={() => setShowForm(true)} style={plusButtonStyle}>
          +
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* List of groups */}
      <ul style={listStyle}>
        {userGroups.map((grp) => (
          <li
            key={grp.group_id}
            style={listItemStyle(grp.group_name === selectedGroup)}
            onClick={() => onSelectGroup(grp.group_name)}
          >
            <span>{grp.group_name}</span>
            {/* Always show the per‑group member management plus button */}
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

      {/* Modal pop-up for managing members for the selected group */}
      {expandedGroupId && (
        <div style={memberModalOverlayStyle}>
          <div style={memberModalContentStyle}>
            <button
              onClick={() => setExpandedGroupId(null)}
              style={closeButtonStyle}
            >
              ×
            </button>
            <h4 style={{ margin: "0 0 0.5rem 0" }}>
              Manage Members for{" "}
              {
                userGroups.find((g) => g.group_id === expandedGroupId)
                  ?.group_name || "Group"
              }
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

      {/* Modal pop-up for creating a new group */}
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
// Modified ChatSection to integrate with backend messaging endpoints
export const ChatSection = ({ selectedGroup }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");

  // Helper: Read a named cookie (e.g., "csrftoken")
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

  // Fetch current user info on mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch("http://localhost:8000/user_info/", {
          credentials: "include",
        });
        const data = await response.json();
        if (data.error) {
          setError(data.error);
        } else {
          setCurrentUser(data);
        }
      } catch (err) {
        setError(err.message);
      }
    };
    fetchUserInfo();
  }, []);

  // Poll for messages when currentUser and selectedGroup are available
  useEffect(() => {
    if (!currentUser || !selectedGroup) return;

    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/retrieve_messages/?user_id=${currentUser.id}`,
          { credentials: "include" }
        );
        const data = await response.json();
        if (data.error) {
          setError(data.error);
        } else {
          // Filter messages exchanged with the selected group member
          const filteredMessages = data.messages.filter(
            (msg) =>
              (msg.user_sending === currentUser.id &&
                msg.user_receiving === selectedGroup.id) ||
              (msg.user_sending === selectedGroup.id &&
                msg.user_receiving === currentUser.id)
          );
          setMessages(filteredMessages);
        }
      } catch (err) {
        setError(err.message);
      }
    };

    // Initial fetch and then polling every 3 seconds
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [currentUser, selectedGroup]);

  // Handler for sending a new message
  const onSendMessage = async () => {
    if (!newMessage || !currentUser || !selectedGroup) return;
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
          user_recieving: selectedGroup.id,
          message: newMessage,
        }),
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setNewMessage("");
        // Optionally, refresh messages immediately (polling will catch the new message soon)
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Styling definitions
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

  // Handle Enter key press in the input
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      onSendMessage();
    }
  };

  return (
    <div style={chatStyle}>
      <div style={chatHeaderStyle}>
        <h3>{selectedGroup.name}</h3>
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div style={messagesContainerStyle}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ marginBottom: "0.5rem" }}>
            <strong>
              {msg.user_sending === currentUser?.id
                ? "You"
                : selectedGroup.name}
              :
            </strong>{" "}
            {msg.content}
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

/** ========== GROUP RECOMMENDATION (MOVIE POLL) ========== */
export const MoviePoll = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState(null);

  // Hardcode a group_id or pass it from parent
  const groupId = 123;

  // On mount, fetch data from group_recommendation
  useEffect(() => {
    const fetchGroupRecommendations = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/group_recommendation/?group_id=${groupId}`,
          { credentials: "include" }
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch recommendations: ${response.status}`
          );
        }
        const data = await response.json();
        if (data.error) {
          setError(data.error);
        } else {
          setRecommendations(data.Recommendations || []);
        }
      } catch (err) {
        setError(err.toString());
      }
    };

    fetchGroupRecommendations();
  }, [groupId]);

  // Optional: handle "vote" or other actions
  const handleVote = (recommendId) => {
    setRecommendations((prev) =>
      prev.map((rec) =>
        rec.id === recommendId
          ? { ...rec, votes: (rec.votes || 0) + 1 }
          : rec
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
    backgroundColor: "#240046",
  };

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
      <h3>Group Recommendations</h3>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={pollItemsStyle}>
        {recommendations.map((rec) => (
          <div key={rec.id} style={pollItemStyle}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "bold" }}>
                {rec.title || `Recommendation #${rec.id}`}
              </div>
              {/* More fields, e.g. <div>{rec.description}</div> */}
            </div>
            <button
              style={voteButtonStyle}
              onClick={() => handleVote(rec.id)}
            >
              Vote
            </button>
            <span>{rec.votes || 0} votes</span>
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
