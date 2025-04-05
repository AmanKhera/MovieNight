import React, { useState } from 'react';

const MovieSummaryGenerator = () => {
  const [movieData, setMovieData] = useState(
`{
  "Title": "Guardians of the Galaxy Vol. 2",
  "Year": "2017",
  "Rated": "PG-13",
  "Released": "05 May 2017",
  "Runtime": "136 min",
  "Genre": "Action, Adventure, Comedy",
  "Director": "James Gunn"
}`
  );
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const getCsrfToken = () => {
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];
    return cookieValue || '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSummary('');
    
    try {
      const response = await fetch('http://localhost:8000/generate-movie-summary/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({ movie_data: movieData }),
        credentials: 'include'
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate summary');
      }

      setSummary(data.summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Movie Summary Generator</h2>
      
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Paste movie information (JSON format):
          </label>
          <textarea
            value={movieData}
            onChange={(e) => setMovieData(e.target.value)}
            style={styles.textarea}
            required
            disabled={isLoading}
          />
        </div>
        
        <button 
          type="submit" 
          disabled={isLoading}
          style={isLoading ? styles.buttonDisabled : styles.button}
        >
          {isLoading ? 'Generating Summary...' : 'Generate Summary'}
        </button>
      </form>
      
      {error && (
        <div style={styles.errorContainer}>
          <h3 style={styles.errorHeading}>Error:</h3>
          <p>{error}</p>
        </div>
      )}
      
      {summary && (
        <div style={styles.summaryContainer}>
          <h3 style={styles.summaryHeading}>Movie Summary:</h3>
          <p style={styles.summaryText}>{summary}</p>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '2rem auto',
    padding: '2rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  heading: {
    color: '#343a40',
    textAlign: 'center',
    marginBottom: '1.5rem'
  },
  form: {
    marginBottom: '2rem'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '600',
    color: '#495057'
  },
  textarea: {
    width: '100%',
    minHeight: '200px',
    padding: '0.75rem',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '1rem',
    lineHeight: '1.5',
    resize: 'vertical'
  },
  button: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'background-color 0.3s'
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
    cursor: 'not-allowed',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    fontWeight: '600',
    color: 'white'
  },
  errorContainer: {
    marginTop: '1.5rem',
    padding: '1rem',
    backgroundColor: '#f8d7da',
    borderLeft: '4px solid #dc3545',
    borderRadius: '4px',
    color: '#721c24'
  },
  errorHeading: {
    marginTop: '0',
    color: '#dc3545'
  },
  summaryContainer: {
    marginTop: '2rem',
    padding: '1.5rem',
    backgroundColor: '#e2f3ff',
    borderRadius: '4px',
    borderLeft: '4px solid #17a2b8'
  },
  summaryHeading: {
    marginTop: '0',
    color: '#0056b3'
  },
  summaryText: {
    whiteSpace: 'pre-wrap',
    lineHeight: '1.6'
  }
};

export default MovieSummaryGenerator;