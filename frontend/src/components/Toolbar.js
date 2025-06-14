import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Toolbar.css';
import logo from '../images/logo.png';
import searchImage from '../images/search-btn.png';
import discoverImage from '../images/discover-btn.png';
import ratingImage from '../images/rating-btn.png';
import messageImage from '../images/message-btn.png';
import friendsImage from '../images/friends-btn.png';
import profileImage from '../images/profile-btn.png';
/**
 * Toolbar that allows navigation throughout the site. This is used in all pages EXCEPT the homepage which has its own toolbar named "PopularToolbar"
 *
 */
function Toolbar() {
  
  const navigate = useNavigate();
  
 
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false); 
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  //Navigational urls
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

  // When a user presses the profile this is executed (a pop up with letterbox info/sign out optoin)
  const profileButtonAction = () => {
    setShowProfilePopup(true);
    setUploadStatus(''); 
  };

  //X button
  const closePopup = () => {
    setShowProfilePopup(false);
    setShowInstructions(false); 
    setIsUploading(false);
    setUploadStatus('');
  };

  

  // Upload user's letterboxd to AWS s3 bucket
  const uploadFileToS3 = async (file) => {
    try {
      setIsUploading(true);
      setUploadStatus('Uploading file...');

      const formData = new FormData();
      formData.append('file', file);

      //call backend upload file function
      const response = await fetch('http://localhost:8000/upload-file/', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setUploadStatus(`✅ File uploaded!`);
        console.log('File uploaded to S3:', result.file_url);
        return result;
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(`❌ Upload failed: ${error.message}`);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

 
  //If the user presses upload to letterboxd
  const handleLetterboxdUpload = () => {
    setShowInstructions(true);
  };

  //User has CSV file from Letterboxd and wants to upload
  const proceedWithUpload = () => {
    setShowInstructions(false);
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.onchange = async (event) => {
      const file = event.target.files[0];
      if (file) {
        try {
          
          if (!file.name.endsWith('.csv')) {
            alert('Please upload a CSV file');
            return;
          }

          
          if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return;
          }

         
          const result = await uploadFileToS3(file);
          
          console.log('Letterboxd CSV uploaded as:', result.file_name);
          
        } catch (error) {
          console.error('Letterboxd upload failed:', error);
        }
      }
    };
    fileInput.click();
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      // Call logout endpoint
      const response = await fetch('http://localhost:8000/logout/', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        console.log('User logged out');
        setShowProfilePopup(false);
        
        // Clear any local storage/session data
        localStorage.clear();
        sessionStorage.clear();
        
        // Navigate to home page
        navigate("/");
      } else {
        console.error('Logout failed');
        alert('Logout failed. Please try again.');
      }
    } catch (error) {
      console.error('Logout error:', error);
      alert('Logout failed. Please try again.');
    }
  };

  return (
    <>
      <nav>
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
            <span className="hover-text">Profile Options</span>
          </div>
        </div>
      </nav>

      
      {showProfilePopup && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3>{showInstructions ? 'How to Get Your Letterboxd Data' : 'Profile Options'}</h3>
              <button className="close-button" onClick={closePopup}>×</button>
            </div>
            <div className="popup-body">
              {showInstructions ? (
                <>
                  <div className="instructions-content">
                    <div className="instruction-step">
                      <h4>📋 Step 1: Go to Letterboxd Settings</h4>
                      <p>Log into your Letterboxd account and navigate to your <strong>Account Settings</strong></p>
                    </div>
                    
                    <div className="instruction-step">
                      <h4>💾 Step 2: Export Your Data</h4>
                      <p>Look for the <strong>"Export your data"</strong> section and click <strong>"Export"</strong></p>
                    </div>
                    
                    <div className="instruction-step">
                      <h4>📧 Step 3: Check Your Email</h4>
                      <p>Letterboxd will email you a download link (this may take a few minutes)</p>
                    </div>
                    
                    <div className="instruction-step">
                      <h4>📁 Step 4: Download & Extract</h4>
                      <p>Download the ZIP file and extract it. Look for the <strong>"ratings.csv"</strong> file</p>
                    </div>
                    
                    <div className="instruction-step">
                      <h4>⚠️ Important Note</h4>
                      <p>Make sure to upload the <strong>"ratings.csv"</strong> file, not any other CSV from the export</p>
                    </div>
                  </div>
                  
                  <div className="instruction-buttons">
                    <button 
                      className="popup-option instruction-button"
                      onClick={() => window.open('https://letterboxd.com/settings/data/', '_blank')}
                    >
                      🔗 Open Letterboxd Settings
                    </button>
                    <button 
                      className="popup-option proceed-button"
                      onClick={proceedWithUpload}
                    >
                      ✅ I Have My CSV File
                    </button>
                    <button 
                      className="popup-option back-button"
                      onClick={() => setShowInstructions(false)}
                    >
                      ← Back to Menu
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button 
                    className="popup-option" 
                    onClick={handleLetterboxdUpload}
                    disabled={isUploading}
                  >
                    📊 Upload to Letterboxd
                  </button>
                  <button className="popup-option" onClick={handleLogout}>
                    🚪 Log Out
                  </button>
                  
                  
                  {uploadStatus && (
                    <div className="upload-status">
                      {isUploading && <div className="loading-spinner">⏳</div>}
                      <p>{uploadStatus}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Toolbar;