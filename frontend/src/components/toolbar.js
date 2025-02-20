import React from 'react';
import './Toolbar.css';

// Placeholder image URLs from Unsplash or similar free image sites
const logoImage = 'https://via.placeholder.com/150x50?text=Logo';
const searchBtnImage = 'https://via.placeholder.com/50?text=🔍';
const discoverBtnImage = 'https://via.placeholder.com/50?text=🌐';
const ratingBtnImage = 'https://via.placeholder.com/50?text=⭐';
const messageBtnImage = 'https://via.placeholder.com/50?text=💬';
const friendsBtnImage = 'https://via.placeholder.com/50?text=👥';
const profileBtnImage = 'https://via.placeholder.com/50?text=👤';

function Toolbar() {
  // Event handlers for each button
  const homeButtonAction = () => {
    alert('Home button clicked!');
    // window.location.href = 'homepage.html';
  };

  const searchButtonAction = () => {
    alert('Search button clicked!');
    // window.location.href = 'search.html';
  };

  const discoverButtonAction = () => {
    alert('Discover button clicked!');
    // window.location.href = 'discover.html';
  };

  const ratingButtonAction = () => {
    alert('Rating button clicked!');
    // window.location.href = 'rating.html';
  };

  const messageButtonAction = () => {
    alert('Message button clicked!');
    // window.location.href = 'message.html';
  };

  const friendsButtonAction = () => {
    alert('Friends button clicked!');
    // window.location.href = 'friends.html';
  };

  const profileButtonAction = () => {
    alert('Profile button clicked!');
    // window.location.href = 'profile.html';
  };

  return (
    <nav>
      <div id="logo" className="button" onClick={homeButtonAction}>
        <button>
          <img src={logoImage} alt="Movie Night logo" className="responsive-image" />
        </button>
        <span className="hover-text-logo">Homepage</span>
      </div>
      <div className="buttons">
        <div className="button" id="search-button" onClick={searchButtonAction}>
          <button>
            <img src={searchBtnImage} alt="search button" />
          </button>
          <span className="hover-text">Search Page</span>
        </div>
        <div className="button" id="discover-button" onClick={discoverButtonAction}>
          <button>
            <img src={discoverBtnImage} alt="discover button" />
          </button>
          <span className="hover-text">Discover Page</span>
        </div>
        <div className="button" id="rating-button" onClick={ratingButtonAction}>
          <button>
            <img src={ratingBtnImage} alt="rating button" />
          </button>
          <span className="hover-text">Rating Page</span>
        </div>
        <div className="button" id="message-button" onClick={messageButtonAction}>
          <button>
            <img src={messageBtnImage} alt="message button" />
          </button>
          <span className="hover-text">Message Page</span>
        </div>
        <div className="button" id="friends-button" onClick={friendsButtonAction}>
          <button>
            <img src={friendsBtnImage} alt="friends button" />
          </button>
          <span className="hover-text">Friends Page</span>
        </div>
        <div className="button" id="profile-button" onClick={profileButtonAction}>
          <button>
            <img src={profileBtnImage} alt="profile button" />
          </button>
          <span className="hover-text">Profile Page</span>
        </div>
      </div>
    </nav>
  );
}

export default Toolbar;