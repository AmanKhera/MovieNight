import React from 'react';
import { useNavigate } from 'react-router-dom'; // <-- Import from react-router-dom
import './Toolbar.css';
import logo from '../images/logo.png';
import searchImage from '../images/search-btn.png';
import discoverImage from '../images/discover-btn.png';
import ratingImage from '../images/rating-btn.png';
import messageImage from '../images/message-btn.png';
import friendsImage from '../images/friends-btn.png';
import profileImage from '../images/profile-btn.png';

function Toolbar() {
  // Get the 'navigate' function from react-router-dom
  const navigate = useNavigate();

  // Use navigate("/") to redirect to the home page
  const homeButtonAction = () => {
    navigate("/");
  };

  // Keep the alerts for the other actions as-is
  const searchButtonAction = () => {
    navigate("/search");
  };
  const discoverButtonAction = () => alert('Discover button clicked!');
  const ratingButtonAction = () => alert('Rating button clicked!');
  const messageButtonAction = () => {
    navigate("/groups");
  };
  const friendsButtonAction = () => alert('Friends button clicked!');
  const profileButtonAction = () => alert('Profile button clicked!');

  return (
    <nav>
      <div id="logo" className="button" onClick={homeButtonAction}>
        <button>
          <img src={logo} alt="Movie Night logo" className="responsive-image" />
        </button>
        <span className="hover-text-logo">Homepage</span>
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
          <span className="hover-text">Rating Page</span>
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
          <span className="hover-text">Friends Page</span>
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
