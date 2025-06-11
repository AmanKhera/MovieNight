import React, { useState, useEffect } from "react";


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
  const [currentUserId, setCurrentUserId] = useState(null);
  const [friendsList, setFriendsList] = useState([]);
  const [error, setError] = useState("");
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friendUsernameToAdd, setFriendUsernameToAdd] = useState("");


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
  const listStyle = { listStyle: "none", margin: 0, padding: 0 };
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
    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex",
    alignItems: "center", justifyContent: "center", zIndex: 1000,
  };
  const modalContentStyle = {
    backgroundColor: "#fff", padding: "1rem", borderRadius: "4px",
    width: "300px", maxWidth: "90%", color: "#000", position: "relative",
    animation: "fadeIn 0.5s ease-out",
  };
  const closeButtonStyle = {
    backgroundColor: "transparent", border: "none", fontSize: "1.2rem",
    cursor: "pointer", position: "absolute", right: "0.5rem", top: "0.5rem",
  };

  // Insert keyframes for modal fadeIn animation
  useEffect(() => {
    if (!document.getElementById("modal-keyframes")) {
      const style = document.createElement("style");
      style.id = "modal-keyframes";
      style.innerHTML = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);


  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch("http://localhost:8000/user_info/", {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch user info");
        const data = await response.json();
        if (data.error) setError(data.error);
        else setCurrentUserId(data.id);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchUserInfo();
  }, []);


  const fetchMutualFriends = async (userId) => {
    if (!userId) return;
    try {
      const response = await fetch(
        `http://localhost:8000/get_mutual_friends/?id=${userId}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch mutual friends");
      const data = await response.json();
      const friendArray = Object.entries(data).map(([id, username]) => ({
        id,
        username,
      }));
      setFriendsList(friendArray);
    } catch (err) {
      setError(err.message);
    }
  };
  useEffect(() => {
    if (currentUserId) fetchMutualFriends(currentUserId);
  }, [currentUserId]);


  const handleAddFriend = async () => {
    if (!currentUserId || !friendUsernameToAdd) return;
    try {
      const friendSearchResp = await fetch(
        `http://localhost:8000/search/?q=${encodeURIComponent(
          friendUsernameToAdd
        )}&filter=user`,
        { credentials: "include" }
      );
      const friendData = await friendSearchResp.json();
      if (!friendSearchResp.ok || !friendData.users?.length) {
        throw new Error(friendData.error || "User not found");
      }
      const friendId = friendData.users[0].id;
      const csrfToken = getCookie("csrftoken");
      const relResp = await fetch(
        `http://localhost:8000/create_relationship/?follower_id=${currentUserId}&following_id=${friendId}`,
        {
          method: "GET",
          headers: { "X-CSRFToken": csrfToken },
          credentials: "include",
        }
      );
      const relJson = await relResp.json();
      if (!relResp.ok) throw new Error(relJson.error || "Failed to update");
      alert(relJson.message || "Relationship updated");
      fetchMutualFriends(currentUserId);
      setFriendUsernameToAdd("");
      setShowAddFriendModal(false);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={sidebarStyle}>
      <div style={headerFlexStyle}>
        <h3 style={{ margin: 0 }}>My Friends</h3>
        <button
          onClick={() => setShowAddFriendModal(true)}
          style={plusButtonStyle}
        >
          +
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <ul style={listStyle}>
        {friendsList.map((friend) => (
          <li
            key={friend.id}
            style={listItemStyle(
              selectedFriend && friend.id === selectedFriend.id
            )}
            onClick={() => onSelectFriend(friend)}
          >
            <span>{friend.username}</span>
          </li>
        ))}
      </ul>

      {showAddFriendModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <button
              onClick={() => setShowAddFriendModal(false)}
              style={closeButtonStyle}
            >
              ×
            </button>
            <h4>Add (or Remove) Friend</h4>
            <p style={{ fontSize: "0.9rem" }}>
              Enter the friend’s username to toggle friendship.
              <br />
              (If they’re already your friend, this will remove them.)
            </p>
            <input
              type="text"
              placeholder="Username"
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

// CHAT SECTION
export const FriendChatSection = ({ selectedFriend }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);


  const chatStyle = {
    flex: 1,
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


  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const resp = await fetch("http://localhost:8000/user_info/", {
          credentials: "include",
        });
        const js = await resp.json();
        if (resp.ok) {
          setCurrentUser({ id: js.id, username: js.username });
        }
      } catch (e) {
        console.error("Fetch user_info error:", e);
      }
    };
    fetchUserInfo();
  }, []);


  const fetchMessages = async () => {
    if (!selectedFriend || !currentUser) return;
    try {
      const num = 50;
      const [aRes, bRes] = await Promise.all([
        fetch(
          `http://localhost:8000/retrieve_messages/?num_messages=${num}&user_id_1=${currentUser.id}&user_id_2=${selectedFriend.id}`,
          { credentials: "include" }
        ),
        fetch(
          `http://localhost:8000/retrieve_messages/?num_messages=${num}&user_id_1=${selectedFriend.id}&user_id_2=${currentUser.id}`,
          { credentials: "include" }
        ),
      ]);
      const aJson = await aRes.json();
      const bJson = await bRes.json();
      if (aRes.ok && bRes.ok) {
        const combined = [...(aJson.messages || []), ...(bJson.messages || [])]
          .sort((x, y) => new Date(x.date_sent) - new Date(y.date_sent));
        setMessages(combined);
      }
    } catch (e) {
      console.error("retrieve_messages error:", e);
      setMessages([]);
    }
  };


  useEffect(() => {
    if (selectedFriend && currentUser) {
      fetchMessages();
      const iv = setInterval(fetchMessages, 1000);
      return () => clearInterval(iv);
    }
  }, [selectedFriend, currentUser]);


  const handleSendMessage = async () => {
    if (!selectedFriend || !newMessage || !currentUser) return;
    try {
      const csrfToken = getCookie("csrftoken");
      const resp = await fetch("http://localhost:8000/send_message/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        credentials: "include",
        body: JSON.stringify({
          user_sending: currentUser.id,
          user_recieving: selectedFriend.id,
          message: newMessage,
        }),
      });
      const js = await resp.json();
      if (resp.ok) {
        setNewMessage("");
        fetchMessages();
      } else {
        console.error("send_message error:", js.error);
      }
    } catch (e) {
      console.error("send_message exception:", e);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSendMessage();
  };

  return (
    <div style={chatStyle}>
      <div style={chatHeaderStyle}>
        <h3>
          {selectedFriend
            ? `Chat with ${selectedFriend.username}`
            : "Select a Friend"}
        </h3>
      </div>
      <div style={messagesContainerStyle}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ marginBottom: "0.5rem" }}>
            <strong>
              {msg.user_sending === currentUser.username
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
