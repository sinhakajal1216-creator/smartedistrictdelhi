import { useState } from 'react';
import '../styles/sdmLocator.css';

export default function SDMLocator() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a locality name');
      setResult(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch(`/api/sdm/search?q=${encodeURIComponent(query)}`);
      
      if (response.status === 404) {
        setError('Locality not found in official MCD ward records');
        setResult(null);
      } else if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Error searching locality');
        setResult(null);
      } else {
        const data = await response.json();
        setResult(data);
        setError(null);
      }
    } catch (err) {
      setError('Failed to connect to server. Please check your connection.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sdm-locator-container">
      <div className="sdm-locator-card">
        <h1>Find Your MCD Ward</h1>
        <p className="subtitle">Enter a locality to find the corresponding MCD ward</p>
        
        <form onSubmit={handleSearch} className="sdm-search-form">
          <div className="search-group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter locality name (e.g., Narela, Burari, Kalkaji)"
              className="sdm-search-input"
              disabled={loading}
            />
            <button 
              type="submit" 
              className="sdm-search-btn"
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
        
        {error && (
          <div className="sdm-error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}
        
        {result && (
          <div className="sdm-result-card">
            <div className="result-header">
              <h2>✓ Ward Found</h2>
            </div>
            <div className="result-details">
              <div className="result-row">
                <span className="result-label">Locality:</span>
                <span className="result-value">{result.locality}</span>
              </div>
              <div className="result-row">
                <span className="result-label">Ward Name:</span>
                <span className="result-value">{result.ward}</span>
              </div>
              <div className="result-row">
                <span className="result-label">Ward Number:</span>
                <span className="result-value">#{result.wardNumber}</span>
              </div>
              {result.acName && (
                <div className="result-row">
                  <span className="result-label">Assembly:</span>
                  <span className="result-value">{result.acName}</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {!result && !error && query && !loading && (
          <div className="sdm-info-message">
            Click "Search" to find the ward for this locality
          </div>
        )}
      </div>
    </div>
  );
}
