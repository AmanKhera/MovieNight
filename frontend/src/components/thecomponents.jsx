// src/components/thecomponents.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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

//Group Sidebar
export const GroupsSidebar = ({
  activeTab,
  onTabChange,
  selectedChat,
  onSelectChat
}) => {
  const [leaderId, setLeaderId] = useState(null);
  const [username, setUsername] = useState("");
  const [userGroups, setUserGroups] = useState([]);
  const [userFriends, setUserFriends] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [genre, setGenre] = useState("");
  const [newFriendId, setNewFriendId] = useState("");
  const [error, setError] = useState("");
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showFriendForm, setShowFriendForm] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();
    const fetchUserInfo = async () => {
      try {
        const res = await fetch("http://localhost:8000/user_info/", {
          credentials: "include",
          signal: abortController.signal,
        });
        const data = await res.json();
        if (res.ok) {
          setLeaderId(data.id);
          setUsername(data.username);
        }
      } catch {
        setError("");
      }
    };
    fetchUserInfo();
    return () => abortController.abort();
  }, []);

  useEffect(() => {
    if (!username) return;
    const abortController = new AbortController();

    const fetchData = async () => {
      try {
        // Fetch groups
        const groupsRes = await fetch(
          `http://localhost:8000/get_user_groups/?username=${username}`,
          { credentials: "include", signal: abortController.signal }
        );
        if (!groupsRes.ok) {
          setError("Failed to fetch groups");
          return;
        }
        const { groups = [] } = await groupsRes.json();
        setUserGroups(groups);

        // Fetch friends
        const friendsRes = await fetch(
          `http://localhost:8000/get_mutual_friends/?id=${leaderId}`,
          { credentials: "include", signal: abortController.signal }
        );
        if (friendsRes.ok) {
          const { friends = [] } = await friendsRes.json();
          setUserFriends(friends);
        }
        setError("");
      } catch {
        setError("Failed to fetch groups/friends data");
      }
    };

    fetchData();
    return () => abortController.abort();
  }, [username]);

  const handleCreateGroup = async () => {
    try {
      const csrfToken = getCookie("csrftoken");
      const res = await fetch("http://localhost:8000/create_group/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          group_name: groupName,
          leader_id: leaderId,
          genre,
        }),
      });
      if (res.ok) {
        const refreshed = await fetch(
          `http://localhost:8000/get_user_groups/?username=${username}`,
          { credentials: "include" }
        );
        const { groups = [] } = await refreshed.json();
        setUserGroups(groups);
        setShowGroupForm(false);
        setGroupName("");
        setGenre("");
      }
    } catch (e) {
      console.error("Error creating group:", e);
    }
  };

  const handleAddFriend = async () => {
    try {
      const csrfToken = getCookie("csrftoken");
      const res = await fetch("http://localhost:8000/add_friend/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({ friend_id: newFriendId }),
      });
      if (res.ok) {
        const refreshed = await fetch(
          `http://localhost:8000/get_friends/?username=${username}`,
          { credentials: "include" }
        );
        const { friends = [] } = await refreshed.json();
        setUserFriends(friends);
        setShowFriendForm(false);
        setNewFriendId("");
      }
    } catch (e) {
      console.error("Error adding friend:", e);
    }
  };

  const sidebarStyle = {
    width: "25%",
    height: "100vh",
    padding: "1.5rem",
    backgroundColor: "#1a0133",
    color: "white",
    overflowY: "auto",
  };

  const tabContainerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  };

  const tabButtonStyle = (isActive) => ({
    padding: "0.8rem 1.2rem",
    fontSize: "1rem",
    backgroundColor: isActive ? "#6a0dad" : "transparent",
    border: "none",
    color: "white",
    cursor: "pointer",
    borderRadius: "4px",
  });

  const listItemStyle = (active) => ({
    padding: "1rem",
    margin: "0.5rem 0",
    backgroundColor: active ? "#240046" : "transparent",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  });

  return (
    <div style={sidebarStyle}>
      <div style={tabContainerStyle}>
        <div>
          <button
            style={tabButtonStyle(activeTab === "groups")}
            onClick={() => onTabChange("groups")}
          >
            Groups
          </button>
          <button
            style={tabButtonStyle(activeTab === "friends")}
            onClick={() => onTabChange("friends")}
          >
            Friends
          </button>
        </div>
        <button
          onClick={() =>
            activeTab === "groups"
              ? setShowGroupForm(true)
              : setShowFriendForm(true)
          }
          style={{
            backgroundColor: "#6a0dad",
            color: "white",
            border: "none",
            padding: "0.6rem 1rem",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          {activeTab === "groups" ? "+ Group" : "+ Friend"}
        </button>
      </div>

      {error && <div style={{ color: "#ff6666", marginBottom: "1rem" }}>{error}</div>}

      {activeTab === "groups" ? (
        <div>
          {userGroups.map((group) => (
            <div
              key={group.group_id}
              style={listItemStyle(selectedChat?.group_id === group.group_id)}
              onClick={() => onSelectChat(group)}
            >
              <span>{group.group_name}</span>
              <span style={{ color: "#888" }}>{group.role}</span>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {userFriends.map((friend) => (
            <div
              key={friend.id}
              style={listItemStyle(selectedChat?.id === friend.id)}
              onClick={() => onSelectChat(friend)}
            >
              {friend.username}
            </div>
          ))}
        </div>
      )}

      {showGroupForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#1a0133",
              padding: "2rem",
              borderRadius: "8px",
              width: "400px",
              color: "white",
              zIndex: 1001,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "1.5rem",
              }}
            >
              <h3>Create New Group</h3>
              <button
                onClick={() => setShowGroupForm(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
            <input
              type="text"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{
                width: "100%",
                padding: "0.8rem",
                marginBottom: "1rem",
                borderRadius: "4px",
                border: "1px solid #6a0dad",
                backgroundColor: "#240046",
                color: "white",
              }}
            />
            <input
              type="text"
              placeholder="Genre (optional)"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              style={{
                width: "100%",
                padding: "0.8rem",
                marginBottom: "1.5rem",
                borderRadius: "4px",
                border: "1px solid #6a0dad",
                backgroundColor: "#240046",
                color: "white",
              }}
            />
            <button
              onClick={handleCreateGroup}
              style={{
                backgroundColor: "#6a0dad",
                color: "white",
                border: "none",
                padding: "1rem",
                borderRadius: "6px",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Create Group
            </button>
          </div>
        </div>
      )}

      {showFriendForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#1a0133",
              padding: "2rem",
              borderRadius: "8px",
              width: "400px",
              color: "white",
              zIndex: 1001,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "1.5rem",
              }}
            >
              <h3>Add New Friend</h3>
              <button
                onClick={() => setShowFriendForm(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
            <input
              type="text"
              placeholder="Friend ID"
              value={newFriendId}
              onChange={(e) => setNewFriendId(e.target.value)}
              style={{
                width: "100%",
                padding: "0.8rem",
                marginBottom: "1.5rem",
                borderRadius: "4px",
                border: "1px solid #6a0dad",
                backgroundColor: "#240046",
                color: "white",
              }}
            />
            <button
              onClick={handleAddFriend}
              style={{
                backgroundColor: "#6a0dad",
                color: "white",
                border: "none",
                padding: "1rem",
                borderRadius: "6px",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Add Friend
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
//*********************************** */
export const ChatSection = ({ selectedChat }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  // === Styling ===
  const chatStyle = {
    width: "75%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#2a0252",
    color: "white",
    position: "relative",
  };

  const headerStyle = {
    padding: "1.5rem",
    backgroundColor: "#240046",
    borderBottom: "2px solid #3a1f5c",
    flexShrink: 0,
  };

  const messagesStyle = {
    flex: 1,
    overflowY: "auto",
    padding: "1.5rem",
    minHeight: 0, // Allows proper scrolling
  };

  const inputContainerStyle = {
    padding: "1.5rem",
    borderTop: "2px solid #3a1f5c",
    display: "flex",
    gap: "1rem",
    backgroundColor: "#2a0252",
    flexShrink: 0,
  };

  const inputStyle = {
    flex: 1,
    padding: "1rem",
    borderRadius: "6px",
    border: "1px solid #6a0dad",
    backgroundColor: "#1a0133",
    color: "white",
    outline: "none",
  };

  const buttonStyle = {
    backgroundColor: "#6a0dad",
    color: "white",
    border: "none",
    padding: "1rem 1.5rem",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "background-color 0.2s",
  };

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const res = await fetch("http://localhost:8000/user_info/", {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) setCurrentUser(data);
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };
    fetchUserInfo();
  }, []);

  useEffect(() => {
    setMessages([]);

    const fetchMessages = async () => {
      if (!selectedChat) return;
      try {
        const endpoint = selectedChat.group_id
          ? `group_messages/?group_id=${selectedChat.group_id}`
          : `group_messages/?group_id=${selectedChat.id}`;

        const res = await fetch(`http://localhost:8000/${endpoint}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) setMessages(data.messages || []);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [selectedChat]);

  const handleSendMessage = async () => {
    if (!selectedChat || !newMessage.trim() || !currentUser) return;

    try {
      const csrfToken = getCookie("csrftoken");
      await fetch("http://localhost:8000/send_message/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          ...(selectedChat.group_id
            ? {
                user_sending: currentUser.id,
                user_recieving: selectedChat.group_id,
              }
            : {
                sender_id: currentUser.id,
                receiver_id: selectedChat.id,
              }),
          message: newMessage.trim(),
        }),
      });
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div style={chatStyle}>
      <div style={headerStyle}>
        <h2>
          {selectedChat?.group_name ||
            selectedChat?.username ||
            "Select a chat"}
        </h2>
      </div>

      <div style={messagesStyle}>
        {messages.length > 0 ? (
          messages.slice().reverse().map((message, index) => (
            <div key={index} style={{ marginBottom: "1rem" }}>
              <strong>
                {message.sender_id === currentUser?.id
                  ? "You"
                  : message.user_sending || `User ${message.sender_id}`}
                :
              </strong>{" "}
              {message.message_content}
            </div>
          ))
        ) : (
          <div
            style={{
              textAlign: "center",
              marginTop: "2rem",
              color: "#aaa",
            }}
          >
            {selectedChat ? "No messages yet" : "Select a chat to start messaging"}
          </div>
        )}
      </div>

      {selectedChat && (
        <div style={inputContainerStyle}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            style={inputStyle}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            style={buttonStyle}
            disabled={!newMessage.trim()}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
};
/** ========== GROUP RECOMMENDATION (MOVIE POLL) ========== */

const fetchMovieDetails = async (title) => {
  try {
    const searchRes = await fetch(
      `http://localhost:8000/search/?q=${encodeURIComponent(title)}&filter=movie`
    );
    const { movies = [] } = await searchRes.json();
    if (!movies.length) return null;
    const m = movies[0];
    const posterRes = await fetch(
      `http://localhost:8000/movie_poster/?title=${encodeURIComponent(title)}`
    );
    const { poster } = await posterRes.json();
    return {
      id: m.id,
      title: m.title,
      year: m.year,
      poster,
      runtime: m.runtime,
      rating: m.rating,
      upvotes: 0,
      downvotes: 0,
    };
  } catch {
    return null;
  }
};

const UP_VOTE = 1;
const DOWN_VOTE = -1;

export const MoviePoll = ({ selectedItem, activeTab }) => {
  const navigate = useNavigate();

  // === user & view state ===
  const [currentUserId, setCurrentUserId] = useState(null);
  const [pollView, setPollView] = useState("auto"); // "auto" or "fromFriends"
  const isGroup = activeTab === "groups";

  // === data state ===
  const [recommendations, setRecommendations] = useState([]); // for Recommendations tab
  const [groupRecs, setGroupRecs] = useState([]);           // for From Members tab
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // track which recIds the user has already voted on
  const [votedRecIds, setVotedRecIds] = useState(new Set());

  // load current user ID
  useEffect(() => {
    fetch("http://localhost:8000/user_info/", { credentials: "include" })
      .then((r) => r.json())
      .then((js) => setCurrentUserId(js.id))
      .catch(console.error);
  }, []);

  // send a vote and update counts from backend response
  const sendVoteAndUpdate = async (recId, value, listSetter) => {
    if (!currentUserId) return;
    try {
      const resp = await fetch("http://localhost:8000/update_recommendation/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId,
          recommendation_id: recId,
          value,
        }),
      });
      if (!resp.ok) throw new Error("Vote failed");
      const { upvotes, downvotes } = await resp.json();

      // update the appropriate list (recommendations or groupRecs)
      listSetter((prev) =>
        prev.map((m) =>
          (pollView === "auto" ? m.id : m.recId) === recId
            ? { ...m, upvotes, downvotes }
            : m
        )
      );

      // disable further votes on this rec
      setVotedRecIds((s) => new Set(s).add(recId));
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  };

  // main fetch effect
  useEffect(() => {
    if (!selectedItem) return;
    setError(null);
    setLoading(true);

    // === Recommendations tab logic (updated) ===
    const loadRecommendations = async () => {
      try {
        // 1) GET existing group-based recs
        const url = new URL("http://localhost:8000/group_recs/");
        url.searchParams.set(
          "group_id",
          isGroup ? selectedItem.group_id : selectedItem.id
        );
        let resp = await fetch(url, { credentials: "include" });
        if (!resp.ok) throw new Error("Failed to fetch group_recs");
        let data = await resp.json();
        let existing = data.recommendations || [];

        // 2) enrich existing
        const enrichedExisting = (
          await Promise.all(
            existing.map((r) => fetchMovieDetails(r.movie_title))
          )
        )
          .map((d, i) => d && { ...d, id: existing[i].id })
          .filter(Boolean);

        // 3) if fewer than 20, POST to generate_group_recommendations to fill remainder
        let finalList = [...enrichedExisting];
        if (finalList.length < 20) {
          const needed = 20 - finalList.length;
          const genResp = await fetch(
            "http://localhost:8000/generate_group_recommendations/",
            {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                group_id: isGroup
                  ? selectedItem.group_id
                  : selectedItem.id,
                num_of_recs: needed,
              }),
            }
          );
          if (genResp.ok) {
            const { created = [] } = await genResp.json();
            // enrich the newly created ones
            const enrichedNew = (
              await Promise.all(
                created.map((c) => fetchMovieDetails(c.movie_title))
              )
            )
              .map((d, i) => d && { ...d, id: created[i].id })
              .filter(Boolean);
            finalList = finalList.concat(enrichedNew);
          }
        }

        setRecommendations(finalList);
      } catch (e) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    // === From Members tab logic (unchanged) ===
    const loadGroupMembers = async () => {
      setGroupRecs([]); // clear
      try {
        const url = new URL(
          "http://localhost:8000/group_recommendation/"
        );
        url.searchParams.set(
          "group_id",
          isGroup ? selectedItem.group_id : selectedItem.id
        );
        const resp = await fetch(url, { credentials: "include" });
        if (!resp.ok) throw new Error("Failed to fetch from members");
        const data = await resp.json();
        const recs = data.Recommendations || [];
        const details = await Promise.all(
          recs.map((r) => fetchMovieDetails(r.movie_title))
        );
        setGroupRecs(
          details
            .map((d, i) =>
              d
                ? {
                    ...d,
                    recId: recs[i].id,
                    upvotes: 0,
                    downvotes: 0,
                  }
                : null
            )
            .filter(Boolean)
        );
      } catch (e) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    pollView === "auto"
      ? loadRecommendations()
      : loadGroupMembers();
  }, [selectedItem, activeTab, pollView]);

  // --- render ---
  const list = pollView === "auto" ? recommendations : groupRecs;
  const titleText =
    pollView === "auto"
      ? isGroup
        ? "Generated Recommendations"
        : "Friend Recommendations"
      : "From Members";

  return (
    <div
      style={{
        width: "30%",
        color: "white",
        backgroundColor: "#1a0133",
        padding: "1rem",
        overflowY: "auto",
      }}
    >
      <div
        style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}
      >
        <button
          style={{
            flex: 1,
            padding: "0.5rem",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            backgroundColor:
              pollView === "auto" ? "#6a0dad" : "#240046",
            color: "white",
          }}
          onClick={() => setPollView("auto")}
        >
          Recommendations
        </button>
        <button
          style={{
            flex: 1,
            padding: "0.5rem",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            backgroundColor:
              pollView === "fromFriends"
                ? "#6a0dad"
                : "#240046",
            color: "white",
          }}
          onClick={() => setPollView("fromFriends")}
        >
          From Members
        </button>
      </div>

      <h3>{titleText}</h3>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && list.length === 0 && <p>No recommendations yet.</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {list.map((movie) => {
          const idKey =
            pollView === "auto" ? movie.id : movie.recId;
          const hasVoted = votedRecIds.has(idKey);
          return (
            <div
              key={idKey}
              style={{
                backgroundColor: "#240046",
                borderRadius: "8px",
                overflow: "hidden",
                position: "relative",
                cursor: "pointer",
              }}
              onClick={() =>
                navigate(
                  `/movie/${encodeURIComponent(
                    movie.title
                  )}?release_date=${encodeURIComponent(
                    movie.year
                  )}`
                )
              }
            >
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  backgroundColor: "#6a0dad",
                  color: "white",
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontSize: "0.8rem",
                }}
              >
                {movie.rating}
              </div>
              <img
                src={movie.poster}
                alt={movie.title}
                style={{
                  width: "100%",
                  height: 350,
                  objectFit: "cover",
                }}
              />
              <div style={{ padding: "0.5rem" }}>
                <strong>{movie.title}</strong>
                <div
                  style={{ fontSize: "0.8rem", color: "#bbb" }}
                >
                  {movie.year} • {movie.runtime} mins
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.5rem",
                  backgroundColor: "#1a0133",
                }}
              >
                <button
                  style={{
                    border: "none",
                    padding: "0.5rem",
                    borderRadius: 4,
                    cursor: "pointer",
                    backgroundColor: "#2e7d32",
                    color: "white",
                  }}
                  disabled={hasVoted}
                  onClick={(e) => {
                    e.stopPropagation();
                    sendVoteAndUpdate(
                      idKey,
                      UP_VOTE,
                      setRecommendations
                    );
                  }}
                >
                  👍 {movie.upvotes}
                </button>
                <button
                  style={{
                    border: "none",
                    padding: "0.5rem",
                    borderRadius: 4,
                    cursor: "pointer",
                    backgroundColor: "#c62828",
                    color: "white",
                  }}
                  disabled={hasVoted}
                  onClick={(e) => {
                    e.stopPropagation();
                    sendVoteAndUpdate(
                      idKey,
                      DOWN_VOTE,
                      setRecommendations
                    );
                  }}
                >
                  👎 {movie.downvotes}
                </button>
              </div>
            </div>
          );
        })}
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