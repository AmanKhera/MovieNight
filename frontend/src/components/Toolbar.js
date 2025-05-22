import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Toolbar.css';
import logo from '../images/logo.png';
import searchImage from '../images/search-btn.png';
import discoverImage from '../images/discover-btn.png';
import ratingImage from '../images/rating-btn.png';
import messageImage from '../images/message-btn.png';
import friendsImage from '../images/friends-btn.png';
import profileImage from '../images/profile-btn.png';

function Toolbar() {
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
      className="toolbar" 
      style={{
        backgroundColor: `rgba(16, 0, 43, ${scrollOpacity * 0.95})`,
        boxShadow: scrollOpacity > 0.1 ? `0 2px 10px rgba(0, 0, 0, ${scrollOpacity * 0.3})` : 'none'
      }}
    >
      <div id="logo" className="button" onClick={homeButtonAction}>
        <button>
          <img src={logo} alt="Movie Night logo" className="responsive-image" />
        </button>
      </div>
      <div className="buttons">
        <div className="button" id="search-button" onClick={searchButtonAction}>
          <button>
            <img src={searchImage} alt="search button" />
          </button>
          <span className="hover-text">Search Page</span>
        </div>
        <div className="button" id="discover-button" onClick={discoverButtonAction}>
          <button>
            <img src={discoverImage} alt="discover button" />
          </button>
          <span className="hover-text">Discover Page</span>
        </div>
        <div className="button" id="rating-button" onClick={ratingButtonAction}>
          <button>
            <img src={ratingImage} alt="rating button" />
          </button>
          <span className="hover-text">User Journal</span>
        </div>
        <div className="button" id="message-button" onClick={messageButtonAction}>
          <button>
            <img src={messageImage} alt="message button" />
          </button>
          <span className="hover-text">Message Page</span>
        </div>
        <div className="button" id="friends-button" onClick={friendsButtonAction}>
          <button>
            <img src={friendsImage} alt="friends button" />
          </button>
          <span className="hover-text">Watchlists</span>
        </div>
        <div className="button" id="profile-button" onClick={profileButtonAction}>
          <button>
            <img src={profileImage} alt="profile button" />
          </button>
          <span className="hover-text">Profile Page</span>
        </div>
      </div>
    </nav>
  );
}

export default Toolbar;