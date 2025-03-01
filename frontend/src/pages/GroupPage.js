// src/pages/GroupPage.js
import React, { useState } from "react";
import Toolbar from "../components/Toolbar";
import { GroupsSidebar, ChatSection, MoviePoll, UserProfile } from "../components/thecomponents";
import "./GroupPage.css"; // CSS for overriding toolbar, etc.

const GroupPage = () => {
  // Groups
  const [selectedGroup, setSelectedGroup] = useState("Group 1");
  const groups = ["Group 1", "Group 2", "Group 3", "Group 4"];

  // Chat: start empty
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  // Movie Poll
  const [pollItems, setPollItems] = useState([
    { id: 1, title: "Inception", votes: 3 },
    { id: 2, title: "Interstellar", votes: 2 },
    { id: 3, title: "Tenet", votes: 1 },
  ]);

  // Handlers
  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    setMessages([...messages, { sender: "You", text: newMessage.trim() }]);
    setNewMessage("");
  };

  const handleVote = (movieId) => {
    setPollItems((prev) =>
      prev.map((item) =>
        item.id === movieId ? { ...item, votes: item.votes + 1 } : item
      )
    );
  };

  // Page layout styles
  const pageStyle = {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
    fontFamily: "sans-serif",
    margin: 0,
  };

  const contentStyle = {
    flex: 1,
    display: "flex",
    overflow: "hidden",
  };

  return (
    <div className="group-page" style={pageStyle}>
      <Toolbar />

      <div style={contentStyle}>
        <GroupsSidebar
          groups={groups}
          selectedGroup={selectedGroup}
          onSelectGroup={handleSelectGroup}
        />

        <ChatSection
          selectedGroup={selectedGroup}
          messages={messages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          onSendMessage={handleSendMessage}
        />
        <MoviePoll pollItems={pollItems} onVote={handleVote} />
      </div>
    </div>
  );
};

export default GroupPage;
