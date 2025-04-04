import React, { useState, useEffect } from "react";
import Toolbar from "../components/Toolbar";

/** Helper to read a named cookie (for CSRF) */
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

/** ========== FRIENDS SIDEBAR ========== */
export const FriendsSidebar = ({ selectedFriend, onSelectFriend }) => {
  // Current user ID (fetched from backend)
  const [currentUserId, setCurrentUserId] = useState(null);
  // List of mutual friends for the current user.
  const [friendsList, setFriendsList] = useState([]);
  // For error messages
  const [error, setError] = useState("");
  // For toggling the "Add Friend" modal
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  // The friend username that the current user wants to add/remove
  const [friendUsernameToAdd, setFriendUsernameToAdd] = useState("");

  // ====== Styling ======
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

  // 1) Fetch current user info to get the user ID
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
        if (data.error) {
          setError(data.error);
        } else {
          setCurrentUserId(data.id);
        }
      } catch (err) {
        setError(err.message);
      }
    };
    fetchUserInfo();
  }, []);

  // 2) Fetch mutual friends for the current user
  const fetchMutualFriends = async (userId) => {
    if (!userId) return;
    try {
      const response = await fetch(
        `http://localhost:8000/get_mutual_friends/?id=${userId}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch mutual friends");
      }
      const data = await response.json();
      // Convert dictionary to array: { "2": "Alice", ... } -> [{ id: "2", name: "Alice" }, ...]
      const friendArray = Object.entries(data).map(([id, name]) => ({
        id,
        name,
      }));
      setFriendsList(friendArray);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      fetchMutualFriends(currentUserId);
    }
  }, [currentUserId]);

  // 3) Toggle friend relationship using the /create_relationship/ endpoint.
  // Instead of using an ID input, we use the friend’s username.
  // Use the /search/ endpoint to look up a user by username.
  const handleAddFriend = async () => {
    if (!currentUserId || !friendUsernameToAdd) return;
    try {
      // Look up the friend's user id using /search/ with filter=user.
      const friendSearchResponse = await fetch(
        `http://localhost:8000/search/?q=${encodeURIComponent(friendUsernameToAdd)}&filter=user`,
        { credentials: "include" }
      );
      const friendData = await friendSearchResponse.json();
      if (!friendSearchResponse.ok) {
        throw new Error(friendData.error || "Failed to find user");
      }
      if (!friendData.users || friendData.users.length === 0) {
        throw new Error("No user found with that username");
      }
      // Use the first matched user.
      const friendId = friendData.users[0].id;

      // Now call create_relationship using the found friendId.
      const csrfToken = getCookie("csrftoken");
      const url = `http://localhost:8000/create_relationship/?follower_id=${currentUserId}&following_id=${friendId}`;
      const response = await fetch(url, {
        method: "GET",
        headers: { "X-CSRFToken": csrfToken },
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to add/remove friend");
      }
      alert(data.message || "Relationship updated");
      // Refresh the mutual friends list
      fetchMutualFriends(currentUserId);
      setFriendUsernameToAdd("");
      setShowAddFriendModal(false);
    } catch (error) {
      alert(error.message);
    }
  };

  // 4) Render the sidebar
  return (
    <div style={sidebarStyle}>
      {/* Header: "My Friends" with a plus button to open the Add Friend modal */}
      <div style={headerFlexStyle}>
        <h3 style={{ margin: 0 }}>My Friends</h3>
        <button onClick={() => setShowAddFriendModal(true)} style={plusButtonStyle}>
          +
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* List of mutual friends */}
      <ul style={listStyle}>
        {friendsList.map((friend) => (
          <li
            key={friend.id}
            style={listItemStyle(selectedFriend && friend.id === selectedFriend.id)}
            onClick={() => onSelectFriend(friend)}
          >
            <span>{friend.name}</span>
          </li>
        ))}
      </ul>

      {/* Add Friend modal */}
      {showAddFriendModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <button onClick={() => setShowAddFriendModal(false)} style={closeButtonStyle}>
              ×
            </button>
            <h4>Add (or Remove) Friend</h4>
            <p style={{ fontSize: "0.9rem" }}>
              Enter the friend’s username to toggle friendship.
              <br />
              (If they are already your friend, this will remove them.)
            </p>
            <input
              type="text"
              placeholder="Friend Username"
              value={friendUsernameToAdd}
              onChange={(e) => setFriendUsernameToAdd(e.target.value)}
              style={{ marginBottom: "0.5rem", width: "100%" }}
            />
            <button onClick={handleAddFriend}>Submit</button>
          </div>
        </div>
      )}
    </div>
  );
};

/** ========== 1‑ON‑1 CHAT SECTION ========== */
export const FriendChatSection = ({ selectedFriend }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  // Store current user info (id and username)
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

  // 1) Fetch the current user's info from /user_info/
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

  // 2) Fetch messages between currentUser and selectedFriend using /retrieve_messages/
  const fetchMessages = async () => {
    if (!selectedFriend || !currentUser) return;
    try {
      const response = await fetch(
        `http://localhost:8000/retrieve_messages/?num_messages=50&user_id=${selectedFriend.id}`,
        { credentials: "include" }
      );
      const data = await response.json();
      if (response.ok) {
        setMessages(data.messages || []);
      } else {
        console.error("Retrieve error:", data.error);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error retrieving messages:", error);
      setMessages([]);
    }
  };

  // 3) Send a message using /send_message/
  const handleSendMessage = async () => {
    if (!selectedFriend || !newMessage || !currentUser) return;
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
          user_recieving: selectedFriend.id,
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

  // 4) When selectedFriend changes, fetch messages and set up polling every 5 seconds.
  useEffect(() => {
    if (selectedFriend && currentUser) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedFriend, currentUser]);

  // 5) Render the chat section
  return (
    <div style={chatStyle}>
      <div style={chatHeaderStyle}>
        <h3>
          {selectedFriend ? `Chat with ${selectedFriend.name}` : "Select a Friend"}
        </h3>
      </div>

      <div style={messagesContainerStyle}>
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
        <button onClick={handleSendMessage}>➤</button>
      </div>
    </div>
  );
};

/** ========== PARENT COMPONENT: FRIENDS PAGE ========== */
const FriendsPage = () => {
  const [selectedFriend, setSelectedFriend] = useState(null);

  // Basic CSS for layout
  const cssStyles = `
    .friends-page {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    
    .main-content {
      flex: 1;
      display: flex;
      background-color: #f7f7f7;
    }
  `;

  return (
    <>
      <style>{cssStyles}</style>
      <div className="friends-page">
        <Toolbar />
        <div className="main-content">
          <FriendsSidebar
            selectedFriend={selectedFriend}
            onSelectFriend={(friend) => setSelectedFriend(friend)}
          />
          <FriendChatSection selectedFriend={selectedFriend} />
        </div>
      </div>
    </>
  );
};

export default FriendsPage;
