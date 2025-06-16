import React, { useState, useEffect, useRef } from 'react';
/**
 * Displays which friends have seen the current movie.
 * Requires movieID which is the ID of the movie being displayed
 * Requires userID which is the current user's ID (not the friends)
 */
const FriendsWhoWatched = ({ movieId, userId }) => {
  const [friendsWatched, setFriendsWatched] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasCalledAPI = useRef(false);
  const abortControllerRef = useRef(null);

  //Get which friends have watched the current movie from the user's friends page
  useEffect(() => {
    if (!movieId || !userId || hasCalledAPI.current) return;

    const fetchFriendsWhoWatched = async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);
      hasCalledAPI.current = true;
      
      try {
        const response = await fetch(
          `http://localhost:8000/get_following_watch_status/?movie_id=${movieId}&user_id=${userId}`,
          { 
            credentials: "include",
            signal: abortControllerRef.current.signal
          }
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch friends watch status');
        }
        
        const data = await response.json();
        setFriendsWatched(data.Followers_watched || []);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message);
          console.error('Error fetching friends who watched:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFriendsWhoWatched();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [movieId, userId]);



  useEffect(() => {
    hasCalledAPI.current = false;
  }, [movieId, userId]);

  //Parse date into usuable data
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  //Used to show friend's rating in terms of stars
  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Friends Who Watched</h3>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Friends Who Watched</h3>
        <div style={styles.error}>Error: {error}</div>
      </div>
    );
  }

  if (friendsWatched.length === 0) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Friends Who Watched</h3>
        <div style={styles.noFriends}>
          None of your friends have watched this movie yet.
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Friends Who Watched ({friendsWatched.length})</h3>
      <div style={styles.friendsList}>
        {friendsWatched.map((friend, index) => (
          <div key={`${friend.user_id}-${index}`} style={styles.friendItem}>
            <div style={styles.friendHeader}>
              <span style={styles.username}>{friend.username}</span>
              <span style={styles.date}>{formatDate(friend.watched_on)}</span>
            </div>
            
            <div style={styles.rating}>
              <span style={styles.stars}>{renderStars(friend.rating)}</span>
              <span style={styles.ratingNumber}>({friend.rating}/5)</span>
            </div>
            
            {friend.review && friend.review.trim() && (
              <div style={styles.review}>
                "{friend.review}"
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    marginTop: '30px',
    padding: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(125, 0, 255, 0.3)',
  },
  title: {
    color: '#e0aaff',
    fontSize: '1.5rem',
    marginBottom: '15px',
    margin: '0 0 15px 0',
  },
  loading: {
    color: '#adb5bd',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px',
  },
  error: {
    color: '#ff6b6b',
    textAlign: 'center',
    padding: '20px',
  },
  noFriends: {
    color: '#adb5bd',
    textAlign: 'center',
    padding: '20px',
    fontStyle: 'italic',
  },
  friendsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  friendItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: '15px',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  friendHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  username: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '1.1rem',
  },
  date: {
    color: '#adb5bd',
    fontSize: '0.9rem',
  },
  rating: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  stars: {
    color: '#ffd700',
    fontSize: '1.2rem',
  },
  ratingNumber: {
    color: '#adb5bd',
    fontSize: '0.9rem',
  },
  review: {
    color: '#fff',
    fontStyle: 'italic',
    lineHeight: '1.4',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: '10px',
    borderRadius: '4px',
    borderLeft: '3px solid #7d00ff',
  },
};

export default FriendsWhoWatched;