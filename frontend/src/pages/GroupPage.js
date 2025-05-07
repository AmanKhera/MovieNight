// src/pages/GroupPage.js
import React, { useState } from "react";
import Toolbar from "../components/Toolbar";
import {
  GroupsSidebar,
  ChatSection,
  MoviePoll,
  UserProfile
} from "../components/thecomponents";
import "./GroupPage.css";

const GroupPage = () => {
  const [activeTab, setActiveTab] = useState("groups");    // "groups" or "friends"
  const [selectedChat, setSelectedChat] = useState(null);

  // ChatSection state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    setMessages(prev => [
      ...prev,
      {
        sender: "You",
        text: newMessage.trim(),
        timestamp: new Date().toISOString()
      }
    ]);
    setNewMessage("");
  };

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
          activeTab={activeTab}
          onTabChange={setActiveTab}
          selectedChat={selectedChat}
          onSelectChat={handleSelectChat}
        />

        <ChatSection
          selectedChat={selectedChat}
          messages={messages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          onSendMessage={handleSendMessage}
        />

        <MoviePoll
          selectedItem={selectedChat}
          activeTab={activeTab}
        />

        {/* <UserProfile user={currentUser} /> */}
      </div>
    </div>
  );
};

export default GroupPage;
