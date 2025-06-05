// src/pages/GroupPage.js
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Toolbar from "../components/Toolbar";
import MainLayout from "../components/MainLayout";
import {
  GroupsSidebar,
  ChatSection,
  MoviePoll,
  UserProfile
} from "../components/thecomponents";
/*import "./GroupPage.css";*/

const GroupPage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("groups");    // "groups" or "friends"
  const [selectedChat, setSelectedChat] = useState(null);
  const chatUser = location.state?.chatUser || null;

  // ChatSection state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  // When chatUser is passed via state, select them
  useEffect(() => {
    if (chatUser) {
      setActiveTab("friends");
      setSelectedChat(chatUser);
    }
  }, [chatUser]);

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
    <MainLayout>
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
      </div>
  </MainLayout>

  );
};

export default GroupPage;
