// src/components/thecomponents.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  fetchUserInfo,
  fetchUserGroups,
  fetchGroupMembers,
  fetchMutualFriends,
  createGroup,
  addFriend,
  addGroupMember,
  removeGroupMember
} from '../api';


// Helper to read a named cookie (e.g., "csrftoken")
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
  const queryClient = useQueryClient();
  const { data: userInfo } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo,
    staleTime: Infinity
  });
  const leaderId = userInfo?.id;
  const username = userInfo?.username;

  const { data: userGroups = [] } = useQuery({
    queryKey: ['userGroups', username],
    queryFn: () => fetchUserGroups(username),
    enabled: !!username
  });

  const { data: userFriends = [] } = useQuery({
    queryKey: ['mutualFriends', leaderId],
    queryFn: () => fetchMutualFriends(leaderId),
    enabled: !!leaderId
  });

  const [loadedMembers, setLoadedMembers] = useState({});
  const [groupName, setGroupName] = useState("");
  const [genre, setGenre] = useState("");
  const [newFriendId, setNewFriendId] = useState("");
  const [error, setError] = useState("");
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showFriendForm, setShowFriendForm] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [selectedMember, setSelectedMember] = useState("");

  const createGroupMutation = useMutation({
    mutationFn: ({ groupName, leaderId, genre }) =>
      createGroup(getCookie("csrftoken"), { group_name: groupName, leader_id: leaderId, genre }),
    onMutate: async (newGroup) => {
      await queryClient.cancelQueries(['userGroups', username]);
      const previousGroups = queryClient.getQueryData(['userGroups', username]);
      queryClient.setQueryData(['userGroups', username], (old) => [
        ...(old || []),
        {
          group_id: Date.now(),
          group_name: newGroup.groupName,
          leader_id: newGroup.leaderId,
          genre: newGroup.genre,
          role: 'leader'
        }
      ]);
      return { previousGroups };
    },
    onError: (err, newGroup, context) => {
      queryClient.setQueryData(['userGroups', username], context.previousGroups);
      setError("");
    },
    onSettled: () => {
      queryClient.invalidateQueries(['userGroups', username]);
    }
  });

  const addFriendMutation = useMutation({
    mutationFn: (friendId) =>
      addFriend(getCookie("csrftoken"), { friend_id: friendId }),
    onMutate: async (friendId) => {
      await queryClient.cancelQueries(['mutualFriends', leaderId]);
      const previousFriends = queryClient.getQueryData(['mutualFriends', leaderId]);
      queryClient.setQueryData(['mutualFriends', leaderId], (old) => [
        ...(old || []),
        {
          id: Date.now(),
          username: `user_${friendId}`,
          friend_id: friendId
        }

      ]);
      return { previousFriends };
    },
    onError: (err, friendId, context) => {
      queryClient.setQueryData(['mutualFriends', leaderId], context.previousFriends);
      setError("");
    },
    onSettled: () => {
      queryClient.invalidateQueries(['mutualFriends', leaderId]);
    }
  });


  const addMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }) =>
      addGroupMember(getCookie("csrftoken"), { group_id: groupId, user_id: userId }),
    onMutate: async ({ groupId, userId }) => {
      await queryClient.cancelQueries(['groupMembers', groupId]);
      const previousMembers = queryClient.getQueryData(['groupMembers', groupId]);
      const friends = queryClient.getQueryData(['mutualFriends', leaderId]);
      const newMember = friends?.find(f => f.id === userId);
      if (newMember) {
        queryClient.setQueryData(['groupMembers', groupId], (old) => [
          ...(old || []),
          {
            id: userId,
            username: newMember.username
          }
        ]);
      }
      return { previousMembers, groupId };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['groupMembers', context.groupId], context.previousMembers);
      setError("");
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries(['groupMembers', variables.groupId]);
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }) =>
      removeGroupMember(getCookie("csrftoken"), { group_id: groupId, user_id: userId }),
    onMutate: async ({ groupId, userId }) => {
      await queryClient.cancelQueries(['groupMembers', groupId]);
      const previousMembers = queryClient.getQueryData(['groupMembers', groupId]);
      queryClient.setQueryData(['groupMembers', groupId], (old) =>
        old?.filter(member => member.id !== userId) || []
      );
      return { previousMembers, groupId };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['groupMembers', context.groupId], context.previousMembers);
      setError("");
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries(['groupMembers', variables.groupId]);
    }
  });

  const handleCreateGroup = () => {
    if (!groupName || !leaderId) return;
    createGroupMutation.mutate({ groupName, leaderId, genre });
  };

  const handleAddFriend = () => {
    if (!newFriendId) return;
    addFriendMutation.mutate(newFriendId);
  };

  const handleAddMember = (groupId) => {
    if (!selectedMember) return;
    addMemberMutation.mutate({ groupId, userId: selectedMember });
  };

  const handleRemoveMember = (groupId) => {
    if (!selectedMember) return;
    removeMemberMutation.mutate({ groupId, userId: selectedMember });
  };

  const handleGroupClick = async (group) => {
    onSelectChat(group);
    await fetchMembersForGroup(group.group_id);
  };

  const fetchMembersForGroup = async (groupId) => {
    if (!loadedMembers[groupId]) {
      const members = await queryClient.fetchQuery({
        queryKey: ['groupMembers', groupId],
        queryFn: () => fetchGroupMembers(groupId)
      });
      setLoadedMembers(prev => ({ ...prev, [groupId]: members }));
      return members;
    }
    return loadedMembers[groupId];
  };

  const sidebarStyle = {
    width: "25%",
    display: "flex",
    flexDirection: "column",
    height: "90vh",
    backgroundColor: "#1a0133",
    color: "white",
    overflow: "hidden",
    position: "relative",
  };


  const tabContainerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.5rem",
    borderBottom: "1px solid #3a1f5c",
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
    position: "relative",
  });

  const listContainerStyle = {
    flex: 1,
    overflowY: "auto",
    padding: "0 1.5rem",
  };

  const menuButtonStyle = {
    background: "none",
    border: "none",
    color: "white",
    cursor: "pointer",
    fontSize: "1.2rem",
    padding: "0 0.5rem",
  };

  const dropdownStyle = {
    backgroundColor: "#240046",
    color: "white",
    border: "1px solid #6a0dad",
    borderRadius: "4px",
  };

  const actionButtonStyle = {
    backgroundColor: "#6a0dad",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  };

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
        {activeTab === "groups" && (
          <button
            style={{
              backgroundColor: "#6a0dad",
              color: "white",
              border: "none",
              padding: "0.6rem 1rem",
              borderRadius: "6px",
              cursor: "pointer",
            }}
            onClick={() => setShowGroupForm(true)}
          >
            + Group
          </button>
        )}
      </div>

      {error && (
        <div style={{ color: "#ff6666", margin: "1rem 1.5rem 0" }}>
          {error}
        </div>
      )}


      <div style={listContainerStyle}>
        {activeTab === "groups"
          ? userGroups.map((group) => (
            <div
              key={group.group_id}
              style={listItemStyle(selectedChat?.group_id === group.group_id)}
              onClick={() => handleGroupClick(group)}
            >
              <span>{group.group_name}</span>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ color: "#888", marginRight: "0.5rem" }}>
                  {group.role}
                </span>
                <button
                  style={menuButtonStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGroupMenu(showGroupMenu === group.group_id ? null : group.group_id);
                    setActionType(null);
                  }}
                >
                  ⋯
                </button>
              </div>
            </div>
          ))
          : userFriends.map((friend) => (
            <div
              key={friend.id}
              style={listItemStyle(selectedChat?.id === friend.id)}
              onClick={() => onSelectChat(friend)}
            >
              {friend.username}
            </div>
          ))}
      </div>

      {showGroupMenu && (
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
          onClick={() => {
            setShowGroupMenu(null);
            setActionType(null);
          }}
        >
          <div
            style={{
              backgroundColor: "#3a1f5c",
              padding: "1.5rem",
              borderRadius: "8px",
              width: "350px",
              color: "white",
              zIndex: 1001,
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}>
              <h3 style={{ margin: 0 }}>
                {!actionType
                  ? "Manage Group Members"
                  : actionType === "add"
                    ? "Add Member"
                    : "Remove Member"}
              </h3>
              <button
                onClick={() => {
                  setShowGroupMenu(null);
                  setActionType(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  padding: "0.5rem",
                }}
              >
                ×
              </button>
            </div>

            {!actionType ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                <button
                  style={{
                    ...actionButtonStyle,
                    padding: "0.8rem",
                  }}
                  onClick={() => setActionType("add")}
                >
                  Add Member
                </button>
                <button
                  style={{
                    ...actionButtonStyle,
                    padding: "0.8rem",
                  }}
                  onClick={() => setActionType("remove")}
                >
                  Remove Member
                </button>
                <button
                  style={{
                    ...actionButtonStyle,
                    padding: "0.8rem",
                    backgroundColor: "#333",
                  }}
                  onClick={() => setShowGroupMenu(null)}
                >
                  Cancel
                </button>
              </div>
            ) : actionType === "add" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                <select
                  style={{
                    ...dropdownStyle,
                    width: "100%",
                    padding: "0.8rem",
                  }}
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                >
                  <option value="">Select a friend to add</option>
                  {userFriends
                    .filter(
                      (friend) =>
                        !loadedMembers[showGroupMenu]?.some(
                          (member) => member.id === friend.id
                        )
                    )
                    .map((friend) => (
                      <option key={friend.id} value={friend.id}>
                        {friend.username}
                      </option>
                    ))}
                </select>
                <div style={{ display: "flex", gap: "0.8rem" }}>
                  <button
                    style={{
                      ...actionButtonStyle,
                      flex: 1,
                      padding: "0.8rem",
                    }}
                    onClick={() => handleAddMember(showGroupMenu)}
                    disabled={!selectedMember || addMemberMutation.isPending}
                  >
                    {addMemberMutation.isPending ? "Adding..." : "Add"}
                  </button>
                  <button
                    style={{
                      ...actionButtonStyle,
                      flex: 1,
                      padding: "0.8rem",
                      backgroundColor: "#333",
                    }}
                    onClick={() => setActionType(null)}
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                <select
                  style={{
                    ...dropdownStyle,
                    width: "100%",
                    padding: "0.8rem",
                  }}
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                >
                  <option value="">Select a member to remove</option>
                  {loadedMembers[showGroupMenu]
                    ?.filter((member) => member.id !== leaderId)
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.username}
                      </option>
                    ))}
                </select>
                <div style={{ display: "flex", gap: "0.8rem" }}>
                  <button
                    style={{
                      ...actionButtonStyle,
                      flex: 1,
                      padding: "0.8rem",
                    }}
                    onClick={() => handleRemoveMember(showGroupMenu)}
                    disabled={!selectedMember || removeMemberMutation.isPending}
                  >
                    {removeMemberMutation.isPending ? "Removing..." : "Remove"}
                  </button>
                  <button
                    style={{
                      ...actionButtonStyle,
                      flex: 1,
                      padding: "0.8rem",
                      backgroundColor: "#333",
                    }}
                    onClick={() => setActionType(null)}
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
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
              disabled={createGroupMutation.isPending}
              style={{
                backgroundColor: "#6a0dad",
                color: "white",
                border: "none",
                padding: "1rem",
                borderRadius: "6px",
                cursor: "pointer",
                width: "100%",
                opacity: createGroupMutation.isPending ? 0.7 : 1,
              }}
            >
              {createGroupMutation.isPending ? "Creating..." : "Create Group"}
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
              disabled={addFriendMutation.isPending}
              style={{
                backgroundColor: "#6a0dad",
                color: "white",
                border: "none",
                padding: "1rem",
                borderRadius: "6px",
                cursor: "pointer",
                width: "100%",
                opacity: addFriendMutation.isPending ? 0.7 : 1,
              }}
            >
              {addFriendMutation.isPending ? "Adding..." : "Add Friend"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};






//***********CHAT SECTION************ */
//*********************************** */
export const ChatSection = ({ selectedChat }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
    if (!selectedChat || !currentUser) return;

    const chatType = selectedChat.group_id ? "group" : "dm";
    let chatId;
    if (selectedChat.group_id) {
      chatId = selectedChat.group_id;
    } else {
      const ids = [currentUser.id, selectedChat.id].sort((a, b) => a - b); // sort ensures symmetry
      chatId = `${ids[0]}_${ids[1]}`;
    }

    // Close old socket if it exists
    if (socketRef.current) socketRef.current.close();

    // Create new socket
    socketRef.current = new WebSocket(`ws://localhost:8000/ws/chat/${chatType}_${chatId}/`);

    socketRef.current.onopen = () => {
      console.log("WebSocket connected");

      // Optionally request message history if your consumer supports it
      socketRef.current.send(JSON.stringify({
        type: "fetch_messages"
      }));
    };

    socketRef.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      console.log("WS MESSAGE RECEIVED:", data);
      if (data.type === "chat.message") {
        setMessages((prev) => [...prev, data.message]);
        scrollToBottom();
      }

      if (data.type === "chat.history") {
        setMessages(data.messages);
        scrollToBottom();
      }
    };

    socketRef.current.onerror = (e) => {
      console.error("WebSocket error", e);
    };

    socketRef.current.onclose = () => {
      console.log("WebSocket closed");
    };

    return () => {
      socketRef.current?.close();
    };
  }, [selectedChat, currentUser]);

  const sendMessage = () => {
    if (
      !newMessage.trim() ||
      !socketRef.current ||
      socketRef.current.readyState !== WebSocket.OPEN
    )
      return;

    const payload = {
      type: "chat.message",
      message: {
        sender_id: currentUser.id,
        content: newMessage.trim(),
      },
    };

    socketRef.current.send(JSON.stringify(payload));
    setNewMessage("");
  };

  return (
    <div style={styles.chat}>
      <div style={styles.header}>
        <h2>{selectedChat?.group_name || selectedChat?.username || "Select a chat"}</h2>
      </div>

      <div style={styles.messages}>
        {messages.length > 0 ? (
          messages.map((msg, index) => (
            <div key={index} style={{ marginBottom: "1rem" }}>
              <strong>{msg.sender_id === currentUser?.id ? "You" : `User ${msg.sender_id}`}:</strong> {msg.message_content}
            </div>
          ))
        ) : (
          <div style={{ textAlign: "center", marginTop: "2rem", color: "#aaa" }}>
            {selectedChat ? "No messages yet" : "Select a chat to start messaging"}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {selectedChat && (
        <div style={styles.inputContainer}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            style={styles.input}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage} style={styles.button} disabled={!newMessage.trim()}>
            Send
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  chat: {
    width: "75%",
    height: "90vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#2a0252",
    color: "white",
    position: "relative",
  },
  header: {
    padding: "1.5rem",
    backgroundColor: "#240046",
    borderBottom: "2px solid #3a1f5c",
    flexShrink: 0,
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "1.5rem",
    minHeight: 0,
  },
  inputContainer: {
    padding: "1.5rem",
    borderTop: "2px solid #3a1f5c",
    display: "flex",
    gap: "1rem",
    backgroundColor: "#2a0252",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    padding: "1rem",
    borderRadius: "6px",
    border: "1px solid #6a0dad",
    backgroundColor: "#1a0133",
    color: "white",
    outline: "none",
  },
  button: {
    backgroundColor: "#6a0dad",
    color: "white",
    border: "none",
    padding: "1rem 1.5rem",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  },
};















/** ========== GROUP RECOMMENDATION (MOVIE POLL) ========== */

const fetchMovieDetails = async (title, year) => {
  try {
    const searchRes = await fetch(
      `http://localhost:8000/search/?q=${encodeURIComponent(title)}&filter=movie&year=${encodeURIComponent(year)}`
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

const fetchMovieDetailsWithoutYear = async (title) => {
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

  const [currentUserId, setCurrentUserId] = useState(null);
  const [pollView, setPollView] = useState("auto");
  const isGroup = activeTab === "groups";

  const [recommendations, setRecommendations] = useState([]);
  const [groupRecs, setGroupRecs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [votedRecIds, setVotedRecIds] = useState(new Set());


  useEffect(() => {
    fetch("http://localhost:8000/user_info/", { credentials: "include" })
      .then((r) => r.json())
      .then((js) => setCurrentUserId(js.id))
      .catch(console.error);
  }, []);

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
      if (!resp.ok) {
        throw new Error("Vote failed");
      } else {

        const resp = await fetch()//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<---------------------------------------------------------

      }
      const { upvotes, downvotes } = await resp.json();

      listSetter((prev) =>
        prev.map((m) =>
          (pollView === "auto" ? m.id : m.recId) === recId
            ? { ...m, upvotes, downvotes }
            : m
        )
      );

      setVotedRecIds((s) => new Set(s).add(recId));
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  };

  useEffect(() => {
    if (!selectedItem) return;
    setError(null);
    setLoading(true);

    const loadRecommendations = async () => {
      try {
        const url = new URL("http://localhost:8000/group_recs/");
        url.searchParams.set(
          "group_id",
          isGroup ? selectedItem.group_id : selectedItem.id
        );
        let resp = await fetch(url, { credentials: "include" });
        if (!resp.ok) throw new Error("");
        let data = await resp.json();
        let existing = data.recommendations || [];

        const enrichedExisting = (
          await Promise.all(
            existing.map((r) => fetchMovieDetailsWithoutYear(r.movie_title))
          )
        )
          .map((d, i) => d && { ...d, id: existing[i].id })
          .filter(Boolean);


        let finalList = [...enrichedExisting];

        // 3) if fewer than 20, POST to generate_group_recommendations to fill reder

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
            const enrichedNew = (
              await Promise.all(
                created.map((c) => fetchMovieDetailsWithoutYear(c.movie_title))
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

    const loadGroupMembers = async () => {
      setGroupRecs([]);
      try {
        const url = new URL("http://localhost:8000/group_recommendation/");
        url.searchParams.set(
          "group_id",
          isGroup ? selectedItem.group_id : selectedItem.id
        );
        const resp = await fetch(url, { credentials: "include" });
        if (!resp.ok) throw new Error("");
        const data = await resp.json();
        const recs = data.Recommendations || [];
        const details = await Promise.all(
          recs.map((r) => fetchMovieDetails(r.movie_title, r.movie_year))
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

    pollView === "auto" ? loadRecommendations() : loadGroupMembers();
  }, [selectedItem, activeTab, pollView]);


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
        height: "86.6vh",
        color: "white",
        backgroundColor: "#1a0133",
        padding: "1rem",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
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
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "1rem",
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
                  `/movie/${encodeURIComponent(movie.title)}?release_date=${encodeURIComponent(
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
                  height: 200,
                  objectFit: "cover",
                }}
              />
              <div style={{ padding: "0.5rem" }}>
                <strong style={{ fontSize: "0.9rem" }}>{movie.title}</strong>
                <div style={{ fontSize: "0.7rem", color: "#bbb" }}>
                  {movie.year} • {movie.runtime} mins
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.3rem 0.5rem",
                  backgroundColor: "#1a0133",
                }}
              >
                <button
                  style={{
                    border: "none",
                    padding: "0.4rem",
                    borderRadius: 4,
                    cursor: "pointer",
                    backgroundColor: "#2e7d32",
                    color: "white",
                    fontSize: "0.8rem"
                  }}
                  disabled={hasVoted}
                  onClick={(e) => {
                    e.stopPropagation();
                    sendVoteAndUpdate(idKey, UP_VOTE, setRecommendations);
                  }}
                >
                  👍 {movie.upvotes}
                </button>
                <button
                  style={{
                    border: "none",
                    padding: "0.4rem",
                    borderRadius: 4,
                    cursor: "pointer",
                    backgroundColor: "#c62828",
                    color: "white",
                    fontSize: "0.8rem"
                  }}
                  disabled={hasVoted}
                  onClick={(e) => {
                    e.stopPropagation();
                    sendVoteAndUpdate(idKey, DOWN_VOTE, setRecommendations);
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
        <strong>Date Joined:</strong> {new Date(userInfo.date_joined).toLocaleString()}
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
          setError(data.error || "");
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
            setError(data.Failure || "");
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