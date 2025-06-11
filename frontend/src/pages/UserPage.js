import React from "react";
import Toolbar from "../components/Toolbar";
import WatchlistStack from "../components/WatchlistStack";
import WatchlistCarousel from "../components/WatchlistCarousel";
import UsernameDisplay from "../components/UsernameDisplay";
import RecentlyWatchedCarousel from "../components/RecentlyWatchedCarousel";

const UserPage = () => {
  const layoutCSS = `
    .user-layout {
      display: flex;
      gap: 20px;
      margin: 20px;
    }
    /* Left column: UsernameDisplay at the top with less space below,
       then the carousels */
    .left-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;  /* Reduced gap between items */
    }
    /* Container for UsernameDisplay with a small bottom margin */
    .username-container {
      margin-bottom: 5px;
    }
    /* Right column for Top 5 Favs */
    .right-column {
      width: 25%;
    }
  `;

  return (
    <div>
      <style>{layoutCSS}</style>
      <Toolbar />
      <div className="user-layout">
        <div className="left-column">
          <div className="username-container">
            <UsernameDisplay />
          </div>
          <RecentlyWatchedCarousel title="Recently Watched" />
          <WatchlistCarousel title="Watchlist" />
        </div>
        <div className="right-column">
          <WatchlistStack title="Top 5 Favs" />
        </div>
      </div>
    </div>
  );
};

export default UserPage;
