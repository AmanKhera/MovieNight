import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PopularToolbar.css';
import logo from '../images/logo.png';
import searchImage from '../images/search-btn.png';
import discoverImage from '../images/discover-btn.png';
import ratingImage from '../images/rating-btn.png';
import messageImage from '../images/message-btn.png';
import friendsImage from '../images/friends-btn.png';
import profileImage from '../images/profile-btn.png';

function PopularToolbar() {
  const [scrollOpacity, setScrollOpacity] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const maxScroll = 300; // Distance over which to transition from transparent to opaque
      const opacity = Math.min(scrollTop / maxScroll, 1); // Calculate opacity (0 to 1)
      setScrollOpacity(opacity);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const homeButtonAction = () => {
    navigate("/");
  };

  const searchButtonAction = () => {
    navigate("/search");
  };
  
  const discoverButtonAction = () => {
    navigate("/DiscoverPage");
  };
  
  const ratingButtonAction = () => {
    navigate("/ReviewedPage");
  };
  
  const messageButtonAction = () => {
    navigate("/groups");
  };
  
  const friendsButtonAction = () => {
    navigate("/UserWatchlists");
  };
  
  const profileButtonAction = () => {
    navigate("/UserProfile");
  };

  return (
    <nav 
      className="main-toolbar" 
      style={{
        backgroundColor: `rgba(16, 0, 43, ${scrollOpacity * 0.95})`,
        boxShadow: scrollOpacity > 0.1 ? `0 2px 10px rgba(0, 0, 0, ${scrollOpacity * 0.3})` : 'none'
      }}
    >
      <div className="main-toolbar-logo main-toolbar-button" onClick={homeButtonAction}>
        <button className="main-toolbar-logo-button">
          <img src={logo} alt="Movie Night logo" className="main-toolbar-responsive-image" />
        </button>
      </div>
      <div className="main-toolbar-buttons">
        <div className="main-toolbar-button" id="main-search-button" onClick={searchButtonAction}>
          <button className="main-toolbar-nav-button">
            <img src={searchImage} alt="search button" className="main-toolbar-icon" />
          </button>
          <span className="main-toolbar-hover-text">Search Page</span>
        </div>
        <div className="main-toolbar-button" id="main-discover-button" onClick={discoverButtonAction}>
          <button className="main-toolbar-nav-button">
            <img src={discoverImage} alt="discover button" className="main-toolbar-icon" />
          </button>
          <span className="main-toolbar-hover-text">Discover Page</span>
        </div>
        <div className="main-toolbar-button" id="main-rating-button" onClick={ratingButtonAction}>
          <button className="main-toolbar-nav-button">
            <img src={ratingImage} alt="rating button" className="main-toolbar-icon" />
          </button>
          <span className="main-toolbar-hover-text">User Journal</span>
        </div>
        <div className="main-toolbar-button" id="main-message-button" onClick={messageButtonAction}>
          <button className="main-toolbar-nav-button">
            <img src={messageImage} alt="message button" className="main-toolbar-icon" />
          </button>
          <span className="main-toolbar-hover-text">Message Page</span>
        </div>
        <div className="main-toolbar-button" id="main-friends-button" onClick={friendsButtonAction}>
          <button className="main-toolbar-nav-button">
            <img src={friendsImage} alt="friends button" className="main-toolbar-icon" />
          </button>
          <span className="main-toolbar-hover-text">Watchlists</span>
        </div>
        <div className="main-toolbar-button" id="main-profile-button" onClick={profileButtonAction}>
          <button className="main-toolbar-nav-button">
            <img src={profileImage} alt="profile button" className="main-toolbar-icon" />
          </button>
          <span className="main-toolbar-hover-text">Profile Page</span>
        </div>
      </div>
    </nav>
  );
}

export default PopularToolbar;