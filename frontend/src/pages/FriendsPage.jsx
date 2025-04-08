import React, { useState } from "react";
import Toolbar from "../components/Toolbar";
import { FriendsSidebar, FriendChatSection } from "../components/FriendsPageComponents";

const FriendsPage = () => {
  // Use state to track the currently selected friend.
  const [selectedFriend, setSelectedFriend] = useState(null);

  // CSS styles updated for the friends page layout.
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
