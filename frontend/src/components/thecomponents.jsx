
/**
 * All the components in this file are used in the Group Page.
 * This was when I first learned you can have multiple components in one .jsx file which I was testing so I named it "thecomponents"
 * which ended up being a mistake because in the long run having multiple components in one .jsx file results in a VERY long file. Lesson learned.
 * 
 * The following has components"
 *  - Group sidebar >> used to display the user's groups/friends
 *  - Chat >> used as a chat from the user's selected group/friend 
 *  - MoviePoll >> used as a component that houses the Recommendations, Watchlist and Proposals tab on the right side of the page
 */
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

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

dayjs.extend(relativeTime);
export function formatRelativeTime(timestamp) {
  if (!timestamp) return "unknown";

  const parsed = dayjs(timestamp);
  if (!parsed.isValid()) return "unknown";

  return parsed.fromNow(); // e.g., "5 minutes ago"
}
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
  //Get user info from pre-cached api.js data
  const queryClient = useQueryClient();
  const { data: userInfo } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo,
    staleTime: Infinity
  });
  const leaderId = userInfo?.id;
  const username = userInfo?.username;

  //Get userGroups info from precached data in api.js
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

  //Create group functionality
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


  //Add friend functionality
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


  //Add member functionality
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

  //Remove member functionality
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


  //When a user selects a group, the group members are fetched from api.js to use for various functions (remove member)
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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isAtBottomRef = useRef(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const preserveScroll = (prevHeight) => {
    const container = messagesContainerRef.current;
    if (container && prevHeight != null) {
      container.scrollTop = container.scrollHeight - prevHeight;
    }
  };

  
  //Get time translated to year, month and day to be used
  const getRelativeDateLabel = (date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatRelativeTime = (timestamp) => {
    return dayjs(timestamp).fromNow();
  };

  //Fetch user_info from backend
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const res = await fetch("http://localhost:8000/user_info/", {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) setCurrentUser(data);
      } catch (err) {
        console.error("Failed to fetch user info:", err);
      }
    };
    fetchUserInfo();
  }, []);

  //format chatId thats used as the chat room name to either a user chat or a group chat for the websocket address
  useEffect(() => {
    if (!selectedChat || !currentUser) return;

    const chatType = selectedChat.group_id ? "group" : "dm";
    let chatId;
    if (selectedChat.group_id) {
      chatId = selectedChat.group_id;
    } else {
      const ids = [currentUser.id, selectedChat.id].sort((a, b) => a - b);
      chatId = `${ids[0]}_${ids[1]}`;
    }

    if (socketRef.current) socketRef.current.close();

    socketRef.current = new WebSocket(
      `ws://localhost:8000/ws/chat/${chatType}_${chatId}/`
    );

    //fetch previous messages when entering the chatroom
    socketRef.current.onopen = () => {
      setMessages([]);
      setPage(1);
      setHasMore(true);
      socketRef.current.send(JSON.stringify({ type: "fetch_messages", page: 1 }));
    };

    //handle auto scroll when message is sent
    socketRef.current.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === "chat.message") {
        const msg = data.message;

        setMessages((prev) => {
          const replaced = prev.map((m) => {
            const sameSender = m.sender_id === msg.sender_id;
            const sameTime = Math.abs(new Date(m.timestamp) - new Date(msg.timestamp)) < 5000;
            return sameSender && sameTime ? msg : m;
          });
          const alreadyExists = replaced.some(m => m.message_content === msg.message_content && m.sender_id === msg.sender_id);
          return alreadyExists ? replaced : [...replaced, msg];
        });

        if (isAtBottomRef.current) scrollToBottom();
      }

      if (data.type === "chat.history") {
        if (data.messages.length === 0) {
          setHasMore(false);
          return;
        }
        const prevHeight = messagesContainerRef.current?.scrollHeight;
        setMessages((prev) => [...data.messages, ...prev]);
        setTimeout(() => preserveScroll(prevHeight), 50);
      }

      if (data.type === "presence" && selectedChat?.id === data.user_id) {
        setIsOnline(data.is_online);
        if (data.last_seen) setLastSeen(data.last_seen);
      }
    };

    socketRef.current.onclose = () => {
      console.log("WebSocket closed");
    };

    return () => {
      socketRef.current?.close();
    };
  }, [selectedChat, currentUser]);

  
  //send message send to chatconsumer to be save in the message table
  const sendMessage = () => {
    if (!newMessage.trim() || socketRef.current?.readyState !== WebSocket.OPEN) return;
    const payload = {
      type: "chat.message",
      message: {
        sender_id: currentUser.id,
        content: newMessage.trim(),
      },
    };
    setMessages((prev) => [
      ...prev,
      {
        ...payload.message,
        timestamp: new Date().toISOString(),
        status: "sent",
        sender_username: currentUser.username,
        message_content: newMessage.trim(),
      },
    ]);
    socketRef.current.send(JSON.stringify(payload));
    setNewMessage("");
    scrollToBottom();
  };

  //scroll helper function
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    isAtBottomRef.current = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
    if (container.scrollTop < 50 && hasMore && socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: "fetch_messages", page: page + 1 }));
      setPage((prev) => prev + 1);
    }
  };

  return (
    <div style={styles.chat}>
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>
          {selectedChat?.group_name || selectedChat?.username || "Select a chat"}
          {selectedChat?.group_id ? null : isOnline ? (
            <span style={styles.onlineDot}>● Online</span>
          ) : (
            <span style={styles.lastSeen}>
              {lastSeen ? `Last seen ${formatRelativeTime(lastSeen)}` : ""}
            </span>
          )}
        </h2>
      </div>

      <div style={styles.messages} onScroll={handleScroll} ref={messagesContainerRef}>
        {messages.length > 0 ? (
          messages.map((msg, index) => {
            const isSent = msg.sender_id === currentUser?.id;
            const messageDate = new Date(msg.timestamp);
            const formattedDate = getRelativeDateLabel(messageDate);
            const previousMsg = messages[index - 1];
            const showDateHeader =
              index === 0 ||
              new Date(previousMsg.timestamp).toDateString() !== messageDate.toDateString();

            return (
              <React.Fragment key={index}>
                {showDateHeader && (
                  <div style={styles.dateHeader}>{formattedDate}</div>
                )}
                <div style={{ ...styles.messageWrapper, alignItems: isSent ? "flex-end" : "flex-start" }}>
                  {!isSent && selectedChat?.group_id && (
                    <div style={styles.senderUsername}>{msg.sender_username}</div>
                  )}
                  <div
                    style={{
                      ...styles.messageBubble,
                      ...(isSent ? styles.sent : styles.received),
                      ...(isSent
                        ? { borderTopRightRadius: "5px", borderTopLeftRadius: "20px" }
                        : { borderTopLeftRadius: "5px", borderTopRightRadius: "20px" }),
                    }}
                  >
                    <div>{msg.message_content}</div>
                  </div>
                  <div style={styles.meta}>
                    <span style={styles.timestamp}>
                      {messageDate.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {msg.status && isSent && (
                      <span style={styles.status}> · {msg.status}</span>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        ) : (
          <div style={styles.placeholder}>
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
    width: "45%",
    height: "90vh",
    display: "flex",
    flexDirection: "column",
    backgroundImage: "radial-gradient(circle farthest-corner at 50.3% 47.3%, rgb(47, 0, 85) 0.1%, rgb(21, 0, 46) 90%)",
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
    display: "flex",
    flexDirection: "column",
  },
  placeholder: {
    textAlign: "center",
    marginTop: "2rem",
    color: "#aaa",
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
  messageBubble: {
    maxWidth: "70%",
    padding: "0.75rem 1rem",
    marginBottom: "0.75rem",
    borderRadius: "12px",
    wordBreak: "break-word",
  },
  sent: {
    alignSelf: "flex-end",
    backgroundImage: "linear-gradient(359.5deg, rgb(28, 0, 80) 8.8%, rgb(99, 49, 145) 77.4%)",
    color: "white",
    border: "1px solid rgb(161, 79, 255)",
    borderRadius: "20px",
    borderBottomRightRadius: "20px",
    borderBottomLeftRadius: "20px",
    padding: "0.75rem 1.2rem",
    marginBottom: "1rem",
    maxWidth: "70%",
  },

  received: {
    alignSelf: "flex-start",
    backgroundImage: "linear-gradient(359.5deg, rgba(115,122,205,1) 8.8%, rgba(186,191,248,1) 77.4%)",
    color: "black",
    border: "1px solid rgb(248, 253, 255)",
    borderRadius: "20px",
    borderBottomRightRadius: "20px",
    borderBottomLeftRadius: "20px",
    padding: "0.75rem 1.2rem",
    marginBottom: "1rem",
    maxWidth: "70%",
  },

  messageWrapper: {
    display: "flex",
    flexDirection: "column",
    marginBottom: "1.5rem",
  },
  senderUsername: {
    fontSize: "0.75rem",
    marginBottom: "0.25rem",
    color: "#bbb",
  },
  meta: {
    fontSize: "0.8rem",
    color: "#ccc",
    marginTop: "0.3rem",
    display: "flex",
    gap: "0.5rem",
  },
  timestamp: {
    opacity: 0.8,
  },
  dateHeader: {
    textAlign: "center",
    color: "#ccc",
    margin: "1.5rem 0 1rem",
    fontSize: "0.85rem",
    fontWeight: "bold",
    letterSpacing: "0.5px",
  },
  status: {
    fontStyle: "italic",
    opacity: 0.6,
  },
  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "1.25rem",
  },
  onlineDot: {
    color: "lightgreen",
    fontSize: "0.95rem",
    marginLeft: "0.5rem",
  },
  lastSeen: {
    color: "#ccc",
    fontSize: "0.9rem",
    marginLeft: "0.5rem",
    fontStyle: "italic",
  },
};

















/** ========== GROUP RECOMMENDATION (MOVIE POLL) ========== */
//Fetch movie detail by title and year
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
//Fetch movie by title alone
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
  const [pollView, setPollView] = useState("recommendations");
  const [groupThreshold, setGroupThreshold] = useState(3);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('calendar');
  const [selectedProposalId, setSelectedProposalId] = useState(null);
  const isGroup = activeTab === "groups";

  const [recommendations, setRecommendations] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userVotes, setUserVotes] = useState({});
  const [proposalVotes, setProposalVotes] = useState({});

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedMovieForSchedule, setSelectedMovieForSchedule] = useState(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  //If a user sucessfully performs an action such as adding a group member to a group the green success message is visible on the top right
  useEffect(() => {
    if (showSuccessNotification) {
      const timer = setTimeout(() => {
        setShowSuccessNotification(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessNotification]);

  //fetch user info
  useEffect(() => {
    fetch("http://localhost:8000/user_info/", { credentials: "include" })
      .then((r) => r.json())
      .then((js) => setCurrentUserId(js.id))
      .catch(console.error);
  }, []);

  //fetch group threshold (determines how many votes required to get movie added to watchlist)
  const fetchGroupThreshold = async () => {
    if (!isGroup || !selectedItem?.group_id) return;

    try {
      const resp = await fetch(`http://localhost:8000/get_group_members/?group_id=${selectedItem.group_id}`, {
        credentials: "include"
      });
      if (resp.ok) {
        const data = await resp.json();
        setGroupThreshold(data.Threshold || 3);
      }
    } catch (e) {
      console.error("Error fetching group threshold:", e);
      setGroupThreshold(3);
    }
  };

  //fetch frontend username of user
  const fetchUsername = async (userId) => {
    try {
      const resp = await fetch(`http://localhost:8000/frontend_user/?user_id=${userId}`, {
        credentials: "include"
      });
      if (resp.ok) {
        const data = await resp.json();
        return data.Username;
      }
    } catch (e) {
      console.error("Error fetching username:", e);
    }
    return "Member";
  };

  //if a user up votes or down votes a movie
  const sendVoteAndUpdate = async (recId, voteValue) => {
    if (!currentUserId) return;

    try {
      const resp = await fetch("http://localhost:8000/update_recommendation/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId,
          recommendation_id: recId,
          value: voteValue,
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        if (errorData.error === "You've already voted.") {
          setError("You've already voted on this recommendation");
        } else {
          setError("Vote failed");
        }
        return;
      }

      const { recommended, upvotes, downvotes, threshold } = await resp.json();

      setRecommendations((prev) =>
        prev.map((m) =>
          m.recId === recId
            ? {
              ...m,
              upvotes,
              downvotes,
              threshold,
              recommended,
              isInWatchlist: recommended === 1
            }
            : m
        )
      );

      setUserVotes(prev => ({
        ...prev,
        [recId]: voteValue
      }));

      setError(null);

      if (recommended === 1) {
        const movie = recommendations.find(m => m.recId === recId);
        if (movie && isGroup) {
          try {
            const addMovieUrl = new URL("http://localhost:8000/add_movie/");
            addMovieUrl.searchParams.set("movie_id", movie.id);
            addMovieUrl.searchParams.set("id", selectedItem.group_id);
            addMovieUrl.searchParams.set("watchlist_name", "Watchlist");

            const addMovieResp = await fetch(addMovieUrl, { credentials: "include" });
            if (addMovieResp.ok) {
              console.log("Movie successfully added to group watchlist");
            } else {
              console.error("Failed to add movie to watchlist");
            }
          } catch (e) {
            console.error("Error adding movie to watchlist:", e);
          }
        }

        loadWatchlist();
      }

    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  };

  //fetch movie to display using title
  const fetchMoviePoster = async (title) => {
    try {
      const posterUrl = new URL("http://localhost:8000/movie_poster/");
      posterUrl.searchParams.set("title", title);

      const resp = await fetch(posterUrl, { credentials: "include" });
      if (resp.ok) {
        const data = await resp.json();
        return data.poster || null;
      }
    } catch (e) {
      console.error("Error fetching movie poster:", e);
    }
    return null;
  };

  //fetch movie details by Movie ID using our local database
  const fetchMovieDetailsById = async (movieId) => {
    try {
      const searchUrl = new URL("http://localhost:8000/search/");
      searchUrl.searchParams.set("id", movieId);

      const resp = await fetch(searchUrl, { credentials: "include" });
      if (resp.ok) {
        const data = await resp.json();
        const movies = data.movies || [];
        if (movies.length > 0) {
          const movie = movies[0];

          const poster = await fetchMoviePoster(movie.title);

          return {
            id: movie.id,
            title: movie.title,
            year: movie.year,
            runtime: movie.runtime,
            rating: movie.rating,
            plot: movie.plot,
            director: movie.director,
            poster: poster || `https://via.placeholder.com/500x750/240046/ffffff?text=${encodeURIComponent(movie.title)}`
          };
        }
      }
    } catch (e) {
      console.error("Error fetching movie details by ID:", e);
    }
    return null;
  };

  //Loads watchlist when the user presses the Watchlist tab at the top.
  const loadWatchlist = async () => {
    // Clear previous watchlist content
    setWatchlist([]);

    try {
      const watchlistUrl = new URL("http://localhost:8000/watchlist_items/");
      watchlistUrl.searchParams.set("id", selectedItem.group_id);
      watchlistUrl.searchParams.set("watchlist_name", "Watchlist");

      const watchlistResp = await fetch(watchlistUrl, { credentials: "include" });
      if (watchlistResp.ok) {
        const watchlistData = await watchlistResp.json();
        const items = watchlistData.watchlist || [];

        const watchlistWithDetails = await Promise.all(
          items.map(async (item) => {
            try {
              const movieDetails = await fetchMovieDetailsById(item.movie_id);
              return {
                ...item,
                title: movieDetails?.title || `Movie ${item.movie_id}`,
                movieDetails: movieDetails
              };
            } catch (e) {
              console.error("Error fetching movie details for watchlist item:", e);
              return {
                ...item,
                title: `Movie ${item.movie_id}`,
                movieDetails: null
              };
            }
          })
        );

        setWatchlist(watchlistWithDetails);
      } else {
        // If request fails, keep watchlist empty (will show "No movies" message)
        console.error("Failed to fetch watchlist items:", watchlistResp.status);
        setWatchlist([]);
      }
    } catch (e) {
      console.error("Error loading watchlist:", e);
      // If request fails, keep watchlist empty (will show "No movies" message)
      setWatchlist([]);
    }
  };

  //Allows user to vote on proposal in Proposal tab
  const voteOnProposal = async (proposalId, votingValue) => {
    if (!currentUserId) return;

    try {
      const resp = await fetch("http://localhost:8000/vote_on_proposal/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_voting_id: currentUserId,
          proposal_id: proposalId,
          voting_value: votingValue,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();

        loadProposals();
        loadVotesForProposals();

        if (data.proposal_accepted) {
          alert("Proposal accepted! 🎉");
          await fetch("http://localhost:8000/proposal_accepted/", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              proposal_id: proposalId
            }),
          });
        }
      } else {
        const errorData = await resp.json();
        setError(errorData.error || "Failed to vote");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to vote on proposal");
    }
  };

  //If any votes have already been cast beforehand, they are loaded and displayed
  const loadVotesForProposals = async () => {
    try {
      const votesUrl = new URL("http://localhost:8000/retrieve_vote_proposals/");
      votesUrl.searchParams.set("recipient_id", isGroup ? selectedItem.group_id : selectedItem.id);

      const votesResp = await fetch(votesUrl, { credentials: "include" });
      if (votesResp.ok) {
        const votesData = await votesResp.json();
        const votes = votesData.votes || [];

        const votesByProposal = {};
        votes.forEach(vote => {
          if (!votesByProposal[vote.proposal_id]) {
            votesByProposal[vote.proposal_id] = {
              yesVotes: [],
              noVotes: [],
              userVoted: null
            };
          }

          if (vote.vote) {
            votesByProposal[vote.proposal_id].yesVotes.push(vote);
          } else {
            votesByProposal[vote.proposal_id].noVotes.push(vote);
          }

          if (vote.voter_id === currentUserId) {
            votesByProposal[vote.proposal_id].userVoted = vote.vote;
          }
        });

        setProposalVotes(votesByProposal);
      }
    } catch (e) {
      console.error("Error loading votes:", e);
    }
  };

  //Load the groups proposals for the Proposal tab
  const loadProposals = async () => {
    try {
      const proposalsUrl = new URL("http://localhost:8000/retrieve_group_event_proposals/");
      proposalsUrl.searchParams.set("id_retrieving", isGroup ? selectedItem.group_id : selectedItem.id);

      const proposalsResp = await fetch(proposalsUrl, { credentials: "include" });
      if (proposalsResp.ok) {
        const proposalsData = await proposalsResp.json();
        const proposalsList = proposalsData.proposals || [];

        const proposalsWithMovieDetails = await Promise.all(
          proposalsList.map(async (proposal) => {
            try {
              const movieDetails = await fetchMovieDetailsWithoutYear(proposal.movie_title);
              return {
                ...proposal,
                movieDetails: movieDetails
              };
            } catch (e) {
              console.error("Error fetching movie details for proposal:", e);
              return {
                ...proposal,
                movieDetails: null
              };
            }
          })
        );

        setProposals(proposalsWithMovieDetails);
      }
    } catch (e) {
      console.error("Error loading proposals:", e);
      setError("Failed to load proposals");
    }
  };

  //When a movie has reached the Watchlist, this allows the user to schedule a movie at a time to be seen in the Prosposal tab
  const handleScheduleMovie = async () => {
    if (!currentUserId || !selectedMovieForSchedule || !scheduleDate || !scheduleTime) {
      setError("Please fill in all fields");
      return;
    }

    try {
      const proposedDateTime = `${scheduleDate} ${scheduleTime}:00`;

      const resp = await fetch("http://localhost:8000/create_movie_proposal/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_proposing_id: currentUserId,
          user_receiving: isGroup ? selectedItem.group_id : selectedItem.id,
          movie_id: selectedMovieForSchedule.movieDetails?.id || selectedMovieForSchedule.id,
          proposed_date: proposedDateTime,
        }),
      });

      if (resp.ok) {
        setShowScheduleModal(false);
        setSelectedMovieForSchedule(null);
        setScheduleDate("");
        setScheduleTime("");
        setShowSuccessNotification(true); // Show success notification instead of alert
        loadProposals();
      } else {
        const errorData = await resp.json();
        setError(errorData.error || "Failed to create proposal");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to create proposal");
    }
  };
  
  //When the user presses Schedule on a movie, open the modal to allow the user to input Date an d Time
  const openScheduleModal = (movie) => {
    setSelectedMovieForSchedule(movie);
    setShowScheduleModal(true);
    setError(null);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split('T')[0]);
    setScheduleTime("19:00");
  };

  //Get if the passed date has any proposals
  const getProposalsForDate = (date) => {
    if (!date) return [];

    const dateString = date.toISOString().split('T')[0];
    return proposals.filter(proposal => {
      const proposalDate = new Date(proposal.proposed_datetime).toISOString().split('T')[0];
      return proposalDate === dateString;
    }).sort((a, b) => new Date(a.proposed_datetime) - new Date(b.proposed_datetime));
  };

  //Check for time conflicts between proposals on a given date
  const checkTimeConflicts = (dateProposals) => {
    const conflicts = [];
    for (let i = 0; i < dateProposals.length - 1; i++) {
      const current = new Date(dateProposals[i].proposed_datetime);
      const next = new Date(dateProposals[i + 1].proposed_datetime);
      const timeDiff = Math.abs(next - current) / (1000 * 60);

      if (timeDiff < 180) {
        conflicts.push(dateProposals[i].proposal_id);
        conflicts.push(dateProposals[i + 1].proposal_id);
      }
    }
    return conflicts;
  };

  //If a user presses a movie in the calendar, switch to the list to show the user the proposal in list view
  const handleMovieClick = (proposalId) => {
    setSelectedProposalId(proposalId);
    setCalendarView('list');
    setTimeout(() => {
      const element = document.getElementById(`proposal-${proposalId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const formatTime = (datetime) => {
    return new Date(datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  //On load retrieves the selected groups recommendations for the Recommandations tab
  useEffect(() => {
    if (!selectedItem) return;
    setError(null);
    setLoading(true);

    const loadData = async () => {
      if (isGroup) {
        await fetchGroupThreshold();
      }

      if (pollView === "recommendations") {
        try {
          const memberUrl = new URL("http://localhost:8000/group_recommendation/");
          memberUrl.searchParams.set("group_id", isGroup ? selectedItem.group_id : selectedItem.id);

          const memberResp = await fetch(memberUrl, { credentials: "include" });
          let memberRecs = [];

          if (memberResp.ok) {
            const memberData = await memberResp.json();
            const recs = memberData.Recommendations || [];
            const memberDetails = await Promise.all(
              recs.map((r) => fetchMovieDetails(r.movie_title, r.movie_year))
            );

            const memberDetailsWithUsernames = await Promise.all(
              memberDetails.map(async (d, i) => {
                if (!d) return null;
                const username = await fetchUsername(recs[i].member_suggested_id);
                return {
                  ...d,
                  recId: recs[i].id,
                  upvotes: recs[i].upvotes || 0,
                  downvotes: recs[i].downvotes || 0,
                  threshold: recs[i].threshold || 3,
                  recommended: recs[i].recommended || 0,
                  isInWatchlist: recs[i].recommended === 1,
                  source: 'member',
                  username: username
                };
              })
            );

            memberRecs = memberDetailsWithUsernames.filter(Boolean);
          }

          let finalList = [...memberRecs];

          if (finalList.length < 10) {
            const generatedUrl = new URL("http://localhost:8000/group_recs/");
            generatedUrl.searchParams.set("group_id", isGroup ? selectedItem.group_id : selectedItem.id);

            const generatedResp = await fetch(generatedUrl, { credentials: "include" });
            if (generatedResp.ok) {
              const generatedData = await generatedResp.json();
              const existing = generatedData.recommendations || [];

              const enrichedExisting = (
                await Promise.all(
                  existing.map((r) => fetchMovieDetailsWithoutYear(r.movie_title))
                )
              )
                .map((d, i) => d && {
                  ...d,
                  recId: existing[i].id,
                  upvotes: existing[i].upvotes || 0,
                  downvotes: existing[i].downvotes || 0,
                  threshold: existing[i].threshold || 3,
                  recommended: existing[i].recommended || 0,
                  isInWatchlist: existing[i].recommended === 1,
                  source: 'generated'
                })
                .filter(Boolean);

              finalList = finalList.concat(enrichedExisting.slice(0, 10 - finalList.length));
            }
          }

          setRecommendations(finalList);
        } catch (e) {
          console.error(e);
          setError(e.message);
        }
      } else if (pollView === "watchlist") {
        await loadWatchlist();
      } else if (pollView === "proposals") {
        await loadProposals();
        await loadVotesForProposals();
      }

      setLoading(false);
    };

    loadData();
  }, [selectedItem, activeTab, pollView]);

  //Fields to be used for Proposal tab
  const getStatusBadge = (status) => {
    const statusConfig = {
      0: { text: "Pending", color: "#ff9800" },
      1: { text: "Accepted", color: "#4caf50" },
      2: { text: "Rejected", color: "#f44336" }
    };

    const config = statusConfig[status] || { text: "Unknown", color: "#757575" };

    return (
      <span
        style={{
          backgroundColor: config.color,
          color: "white",
          padding: "2px 8px",
          borderRadius: "12px",
          fontSize: "0.7rem",
          fontWeight: "bold"
        }}
      >
        {config.text}
      </span>
    );
  };

  const getRecommendationStatusBadge = (recommended) => {
    const statusConfig = {
      1: { text: "In Watchlist!", color: "#4caf50" },
      "-1": { text: "Rejected", color: "#f44336" },
      0: { text: "Pending", color: "#ff9800" }
    };

    const config = statusConfig[recommended] || { text: "Pending", color: "#ff9800" };

    return (
      <span
        style={{
          backgroundColor: config.color,
          color: "white",
          padding: "2px 6px",
          borderRadius: "4px",
          fontSize: "0.7rem",
          fontWeight: "bold"
        }}
      >
        {config.text}
      </span>
    );
  };

  const getTitleText = () => {
    switch (pollView) {
      case "recommendations":
        return isGroup ? "Group Recommendations" : "Friend Recommendations";
      case "watchlist":
        return "Watchlist";
      case "proposals":
        return "Movie Proposals";
      default:
        return "";
    }
  };

  return (
    <div
      style={{
        width: "30%",
        height: "86.6vh",
        color: "white",
        backgroundColor: "#1a0133",
        padding: "1rem",
        overflowY: "auto",
        position: "relative",
      }}
    >
      {/* Success Notification */}
      {showSuccessNotification && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            backgroundColor: "#4caf50",
            color: "white",
            padding: "16px 20px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 1001,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            animation: showSuccessNotification
              ? "slideInFromRight 0.5s ease-out forwards"
              : "slideOutToRight 0.5s ease-in forwards",
            fontSize: "14px",
            fontWeight: "500",
            maxWidth: "350px",
          }}
        >
          <span style={{ fontSize: "18px" }}>✓</span>
          <span>Movie proposal created successfully</span>
        </div>
      )}

      <style>
        {`
          @keyframes slideInFromRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          @keyframes slideOutToRight {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(100%);
              opacity: 0;
            }
          }
        `}
      </style>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          style={{
            flex: 1,
            padding: "0.5rem",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            backgroundColor: pollView === "recommendations" ? "#6a0dad" : "#240046",
            color: "white",
            fontSize: "0.8rem"
          }}
          onClick={() => setPollView("recommendations")}
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
            backgroundColor: pollView === "watchlist" ? "#6a0dad" : "#240046",
            color: "white",
            fontSize: "0.8rem"
          }}
          onClick={() => setPollView("watchlist")}
        >
          Watchlist
        </button>
        <button
          style={{
            flex: 1,
            padding: "0.5rem",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            backgroundColor: pollView === "proposals" ? "#6a0dad" : "#240046",
            color: "white",
            fontSize: "0.8rem"
          }}
          onClick={() => setPollView("proposals")}
        >
          Proposals
        </button>
      </div>

      <h3>{getTitleText()}</h3>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {pollView === "recommendations" && (
        <>
          {!loading && recommendations.length === 0 && <p>No recommendations yet.</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
            {recommendations.map((movie) => {
              const userVote = userVotes[movie.recId];
              const totalVotes = movie.upvotes + movie.downvotes;
              const displayThreshold = isGroup ? groupThreshold : (movie.threshold || 3);

              return (
                <div
                  key={movie.recId}
                  style={{
                    backgroundColor: "#240046",
                    borderRadius: "8px",
                    overflow: "hidden",
                    position: "relative",
                    cursor: "pointer",
                  }}
                  onClick={() => navigate(`/movie/${encodeURIComponent(movie.title)}?release_date=${encodeURIComponent(movie.year)}`)}
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
                  {movie.source === 'member' && (
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        backgroundColor: "#2e7d32",
                        color: "white",
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontSize: "0.7rem",
                      }}
                    >
                      {movie.username}
                    </div>
                  )}
                  {movie.recommended !== 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: movie.source === 'member' ? 35 : 8,
                        left: 8,
                      }}
                    >
                      {getRecommendationStatusBadge(movie.recommended)}
                    </div>
                  )}
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    style={{ width: "100%", height: 280, objectFit: "cover" }}
                  />
                  <div style={{ padding: "0.5rem" }}>
                    <strong style={{ fontSize: "0.9rem" }}>{movie.title}</strong>
                    <div style={{ fontSize: "0.7rem", color: "#bbb" }}>
                      {movie.year} • {movie.runtime} mins
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#ccc", marginTop: "0.25rem" }}>
                      {movie.upvotes}/{displayThreshold} votes needed for watchlist
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
                        backgroundColor: userVote === 1 ? "#1e7e34" : "#2e7d32",
                        color: "white",
                        fontSize: "0.8rem",
                        opacity: userVote === -1 ? 0.7 : 1
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        sendVoteAndUpdate(movie.recId, 1);
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
                        backgroundColor: userVote === -1 ? "#bd2130" : "#c62828",
                        color: "white",
                        fontSize: "0.8rem",
                        opacity: userVote === 1 ? 0.7 : 1
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        sendVoteAndUpdate(movie.recId, -1);
                      }}
                    >
                      👎 {movie.downvotes}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {pollView === "watchlist" && (
        <>
          {!loading && watchlist.length === 0 && <p>No movies in watchlist yet. Vote for recommendations to add them!</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
            {watchlist.map((item, index) => (
              <div
                key={index}
                style={{
                  backgroundColor: "#240046",
                  borderRadius: "8px",
                  overflow: "hidden",
                  position: "relative",
                  cursor: "pointer",
                }}
                onClick={() => navigate(`/movie/${encodeURIComponent(item.title)}`)}
              >
                {item.movieDetails && (
                  <>
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
                      {item.movieDetails.rating}
                    </div>
                    <img
                      src={item.movieDetails.poster}
                      alt={item.title}
                      style={{ width: "100%", height: 280, objectFit: "cover" }}
                    />
                    <div style={{ padding: "0.5rem" }}>
                      <strong style={{ fontSize: "0.9rem" }}>{item.title}</strong>
                      <div style={{ fontSize: "0.7rem", color: "#bbb" }}>
                        {item.movieDetails.year} • {item.movieDetails.runtime} mins
                      </div>
                    </div>
                  </>
                )}
                <div
                  style={{
                    padding: "0.3rem 0.5rem",
                    backgroundColor: "#1a0133",
                    display: "flex",
                    justifyContent: "center"
                  }}
                >
                  <button
                    style={{
                      border: "none",
                      padding: "0.4rem 1rem",
                      borderRadius: 4,
                      cursor: "pointer",
                      backgroundColor: "#6a0dad",
                      color: "white",
                      fontSize: "0.8rem"
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openScheduleModal(item);
                    }}
                  >
                    📅 Schedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {pollView === "proposals" && (
        <>
          {!loading && proposals.length === 0 && <p>No movie proposals yet. Schedule movies from your watchlist!</p>}

          {proposals.length > 0 && (
            <div style={{ width: "100%" }}>
              <div style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "1rem",
                justifyContent: "center"
              }}>
                <button
                  style={{
                    padding: "0.4rem 0.8rem",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    backgroundColor: calendarView === "calendar" ? "#6a0dad" : "#240046",
                    color: "white",
                    fontSize: "0.7rem",
                    fontWeight: calendarView === "calendar" ? "bold" : "normal"
                  }}
                  onClick={() => setCalendarView("calendar")}
                >
                  📅 Calendar
                </button>
                <button
                  style={{
                    padding: "0.4rem 0.8rem",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    backgroundColor: calendarView === "list" ? "#6a0dad" : "#240046",
                    color: "white",
                    fontSize: "0.7rem",
                    fontWeight: calendarView === "list" ? "bold" : "normal"
                  }}
                  onClick={() => setCalendarView("list")}
                >
                  📋 List
                </button>
              </div>

              {calendarView === "calendar" && (
                <div>
                  <h4 style={{
                    margin: "0 0 1rem 0",
                    color: "white",
                    fontSize: "1rem",
                    textAlign: "center"
                  }}>
                    Next Two Weeks
                  </h4>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: "2px",
                    backgroundColor: "#1a0133",
                    padding: "2px",
                    borderRadius: "4px"
                  }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div
                        key={day}
                        style={{
                          padding: "0.5rem 0.25rem",
                          textAlign: "center",
                          fontSize: "0.7rem",
                          fontWeight: "bold",
                          color: "#bbb",
                          backgroundColor: "#240046"
                        }}
                      >
                        {day}
                      </div>
                    ))}

                    {(() => {
                      const today = new Date();
                      const currentDate = new Date(today);

                      const startOfWeek = new Date(currentDate);
                      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

                      //Display only 14 days or else it makes the component look overcrowded
                      const calendarDays = [];
                      for (let i = 0; i < 14; i++) {
                        const date = new Date(startOfWeek);
                        date.setDate(startOfWeek.getDate() + i);
                        calendarDays.push(date);
                      }

                      return calendarDays.map((date, index) => {
                        const dayProposals = getProposalsForDate(date);
                        const isToday = date.toDateString() === today.toDateString();
                        const isPastDate = date < today && !isToday;

                        return (
                          <div
                            key={`calendar-day-${index}`}
                            style={{
                              minHeight: "120px",
                              backgroundColor: isPastDate ? "#1a1a2e" : "#240046",
                              border: isToday ? "2px solid #6a0dad" : "none",
                              padding: "4px",
                              position: "relative",
                              overflow: "hidden",
                              opacity: isPastDate ? 0.5 : 1
                            }}
                          >
                            <div style={{
                              fontSize: "0.8rem",
                              color: isToday ? "#6a0dad" : isPastDate ? "#666" : "#fff",
                              fontWeight: isToday ? "bold" : "600",
                              marginBottom: "4px",
                              textAlign: "center"
                            }}>
                              {date.getDate()}
                            </div>

                            {!isPastDate && dayProposals.slice(0, 2).map((proposal, propIndex) => {
                              const hasConflict = proposal.hasConflict;

                              return (
                                <div
                                  key={propIndex}
                                  style={{
                                    fontSize: "0.65rem",
                                    backgroundColor: hasConflict ? "#ff5722" : (proposal.status === 1 ? "#2e7d32" : proposal.status === 2 ? "#c62828" : "#ff9800"),
                                    color: "white",
                                    padding: "4px 6px",
                                    marginBottom: "3px",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    overflow: "hidden",
                                    border: hasConflict ? "1px solid #ff1744" : "none",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                                    lineHeight: "1.2"
                                  }}
                                  title={`${proposal.movie_title} at ${formatTime(proposal.proposed_datetime)} - Click to view details`}
                                  onClick={() => handleMovieClick(proposal.proposal_id)}
                                >
                                  <div style={{
                                    fontWeight: "700",
                                    textShadow: "0 1px 1px rgba(0,0,0,0.5)",
                                    marginBottom: "2px"
                                  }}>
                                    {proposal.movie_title.length > 8 ? proposal.movie_title.substring(0, 8) + '...' : proposal.movie_title}
                                  </div>
                                  <div style={{
                                    fontSize: "0.6rem",
                                    opacity: 0.95,
                                    fontWeight: "500"
                                  }}>
                                    ⏰ {formatTime(proposal.proposed_datetime)}
                                  </div>
                                </div>
                              );
                            })}

                            {!isPastDate && dayProposals.length > 2 && (
                              <div
                                style={{
                                  fontSize: "0.6rem",
                                  color: "#bbb",
                                  textAlign: "center",
                                  fontStyle: "italic",
                                  marginTop: "2px",
                                  cursor: "pointer"
                                }}
                                onClick={() => setCalendarView('list')}
                              >
                                +{dayProposals.length - 2} more
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  <div style={{
                    marginTop: "1rem",
                    fontSize: "0.65rem",
                    color: "#bbb",
                    display: "flex",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                    justifyContent: "center"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <div style={{ width: "8px", height: "8px", backgroundColor: "#ff9800", borderRadius: "2px" }}></div>
                      Pending
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <div style={{ width: "8px", height: "8px", backgroundColor: "#2e7d32", borderRadius: "2px" }}></div>
                      Accepted
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <div style={{ width: "8px", height: "8px", backgroundColor: "#c62828", borderRadius: "2px" }}></div>
                      Rejected
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <div style={{ width: "8px", height: "8px", backgroundColor: "#ff5722", borderRadius: "2px", border: "1px solid #ff1744" }}></div>
                      Conflict
                    </div>
                  </div>
                  <div style={{
                    marginTop: "0.5rem",
                    fontSize: "0.6rem",
                    color: "#999",
                    textAlign: "center"
                  }}>
                    Click on a movie to view details
                  </div>
                </div>
              )}

              {calendarView === "list" && (
                <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
                  {(() => {
                    const today = new Date();
                    const currentDate = new Date(today);

                    const startOfWeek = new Date(currentDate);
                    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

                    const endOfCalendar = new Date(startOfWeek);
                    endOfCalendar.setDate(startOfWeek.getDate() + 13);
                    endOfCalendar.setHours(23, 59, 59, 999);

                    const filteredProposalsByDate = {};
                    proposals.forEach(proposal => {
                      const proposalDate = new Date(proposal.proposed_datetime);
                      if (proposalDate >= startOfWeek && proposalDate <= endOfCalendar) {
                        const dateKey = proposalDate.toISOString().split('T')[0];
                        if (!filteredProposalsByDate[dateKey]) {
                          filteredProposalsByDate[dateKey] = [];
                        }
                        filteredProposalsByDate[dateKey].push(proposal);
                      }
                    });

                    Object.keys(filteredProposalsByDate).forEach(date => {
                      filteredProposalsByDate[date].sort((a, b) => new Date(a.proposed_datetime) - new Date(b.proposed_datetime));
                      const conflicts = checkTimeConflicts(filteredProposalsByDate[date]);
                      filteredProposalsByDate[date].forEach(proposal => {
                        proposal.hasConflict = conflicts.includes(proposal.proposal_id);
                      });
                    });

                    return Object.entries(filteredProposalsByDate)
                      .sort(([a], [b]) => new Date(a) - new Date(b))
                      .map(([date, dayProposals]) => {
                        const dateObj = new Date(date);
                        const isToday = dateObj.toDateString() === new Date().toDateString();
                        const isTomorrow = dateObj.toDateString() === new Date(Date.now() + 86400000).toDateString();

                        return (
                          <div key={date} style={{ marginBottom: "1.5rem" }}>
                            <h4 style={{
                              color: isToday ? "#6a0dad" : "#fff",
                              fontSize: "0.9rem",
                              margin: "0 0 0.75rem 0",
                              fontWeight: "bold",
                              borderBottom: "1px solid #444",
                              paddingBottom: "0.25rem"
                            }}>
                              📅 {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                            </h4>

                            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                              {dayProposals.map((proposal) => {
                                const votes = proposalVotes[proposal.proposal_id] || { yesVotes: [], noVotes: [], userVoted: null };
                                const isPending = proposal.status === 0;
                                const hasUserVoted = votes.userVoted !== null;
                                const hasConflict = proposal.hasConflict;
                                const isSelected = selectedProposalId === proposal.proposal_id;

                                return (
                                  <div
                                    key={proposal.proposal_id}
                                    id={`proposal-${proposal.proposal_id}`}
                                    style={{
                                      backgroundColor: isSelected ? "#6a0dad" : "#240046",
                                      borderRadius: "6px",
                                      padding: "0.75rem",
                                      border: hasConflict ? "2px solid #ff5722" : isSelected ? "2px solid #9c4dcc" : "1px solid #444",
                                      position: "relative",
                                      transition: "all 0.3s ease",
                                      boxShadow: isSelected ? "0 0 10px rgba(106, 13, 173, 0.5)" : "none"
                                    }}
                                  >
                                    {hasConflict && (
                                      <div style={{
                                        position: "absolute",
                                        top: "0.25rem",
                                        right: "0.25rem",
                                        backgroundColor: "#ff5722",
                                        color: "white",
                                        padding: "2px 6px",
                                        borderRadius: "4px",
                                        fontSize: "0.6rem",
                                        fontWeight: "bold"
                                      }}>
                                        ⚠️ CONFLICT
                                      </div>
                                    )}

                                    {isSelected && (
                                      <div style={{
                                        position: "absolute",
                                        top: "0.25rem",
                                        left: "0.25rem",
                                        backgroundColor: "#9c4dcc",
                                        color: "white",
                                        padding: "2px 6px",
                                        borderRadius: "4px",
                                        fontSize: "0.6rem",
                                        fontWeight: "bold"
                                      }}>
                                        📍 SELECTED
                                      </div>
                                    )}

                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                                      <div style={{ flex: 1, marginRight: hasConflict || isSelected ? "4rem" : "0", marginTop: isSelected ? "1.5rem" : "0" }}>
                                        <h5 style={{ margin: "0 0 0.25rem 0", color: "#fff", fontSize: "0.85rem" }}>
                                          🎬 {proposal.movie_title}
                                        </h5>
                                        <p style={{ margin: "0", fontSize: "0.75rem", color: "#bbb" }}>
                                          ⏰ {formatTime(proposal.proposed_datetime)} • By: <strong>{proposal.proposed_by}</strong>
                                        </p>
                                      </div>
                                      {getStatusBadge(proposal.status)}
                                    </div>

                                    <div style={{ display: "flex", gap: "1rem", fontSize: "0.7rem", color: "#ccc", marginBottom: isPending ? "0.75rem" : "0" }}>
                                      <span style={{ color: "#4caf50" }}>✅ Yes: {votes.yesVotes.length}</span>
                                      <span style={{ color: "#f44336" }}>❌ No: {votes.noVotes.length}</span>
                                    </div>

                                    {isPending && (
                                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                        <button
                                          style={{
                                            border: "none",
                                            padding: "0.4rem 0.8rem",
                                            borderRadius: 4,
                                            cursor: hasUserVoted ? "not-allowed" : "pointer",
                                            backgroundColor: votes.userVoted === true ? "#4caf50" : "#2e7d32",
                                            color: "white",
                                            fontSize: "0.7rem",
                                            opacity: hasUserVoted && votes.userVoted !== true ? 0.5 : 1
                                          }}
                                          disabled={hasUserVoted}
                                          onClick={() => voteOnProposal(proposal.proposal_id, true)}
                                        >
                                          {votes.userVoted === true ? "✅ Voted Yes" : "Accept"}
                                        </button>
                                        <button
                                          style={{
                                            border: "none",
                                            padding: "0.4rem 0.8rem",
                                            borderRadius: 4,
                                            cursor: hasUserVoted ? "not-allowed" : "pointer",
                                            backgroundColor: votes.userVoted === false ? "#f44336" : "#c62828",
                                            color: "white",
                                            fontSize: "0.7rem",
                                            opacity: hasUserVoted && votes.userVoted !== false ? 0.5 : 1
                                          }}
                                          disabled={hasUserVoted}
                                          onClick={() => voteOnProposal(proposal.proposal_id, false)}
                                        >
                                          {votes.userVoted === false ? "❌ Voted No" : "Reject"}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                  })()}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showScheduleModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowScheduleModal(false)}
        >
          <div
            style={{
              backgroundColor: "#240046",
              padding: "2rem",
              borderRadius: "12px",
              border: "2px solid #6a0dad",
              minWidth: "400px",
              maxWidth: "500px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: "white", marginTop: 0 }}>
              Schedule: {selectedMovieForSchedule?.title || selectedMovieForSchedule?.movieDetails?.title}
            </h3>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", color: "white", marginBottom: "0.5rem" }}>Date:</label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  border: "1px solid #6a0dad",
                  backgroundColor: "#1a0133",
                  color: "white",
                }}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", color: "white", marginBottom: "0.5rem" }}>Time:</label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  border: "1px solid #6a0dad",
                  backgroundColor: "#1a0133",
                  color: "white",
                }}
              />
            </div>

            {error && (
              <p style={{ color: "#f44336", fontSize: "0.9rem", marginBottom: "1rem" }}>{error}</p>
            )}

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button
                style={{
                  padding: "0.5rem 1rem",
                  border: "none",
                  borderRadius: "4px",
                  backgroundColor: "#757575",
                  color: "white",
                  cursor: "pointer",
                }}
                onClick={() => setShowScheduleModal(false)}
              >
                Cancel
              </button>
              <button
                style={{
                  padding: "0.5rem 1rem",
                  border: "none",
                  borderRadius: "4px",
                  backgroundColor: "#6a0dad",
                  color: "white",
                  cursor: "pointer",
                }}
                onClick={handleScheduleMovie}
              >
                Create Proposal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};









