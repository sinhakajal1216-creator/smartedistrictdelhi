import { useState } from 'react';
import api from '../services/api';
import '../styles/sdmLocator.css';

function MappingDetails({ result }) {
  return (
    <div className="mapping-details">
      <h3>Jurisdiction chain</h3>
      <div className="result-row"><span className="result-label">Locality:</span><span className="result-value">{result.locality}</span></div>
      <div className="result-row"><span className="result-label">MCD Ward:</span><span className="result-value">{result.ward}</span></div>
      <div className="result-row"><span className="result-label">Ward Number:</span><span className="result-value">#{result.wardNumber}</span></div>
      {result.sdmJurisdiction?.subDivision && <div className="result-row"><span className="result-label">Sub-Division:</span><span className="result-value">{result.sdmJurisdiction.subDivision}</span></div>}
      {result.sdmJurisdiction?.area && <div className="result-row"><span className="result-label">SDM District Area:</span><span className="result-value">{result.sdmJurisdiction.area}</span></div>}
      {result.acName && <div className="result-row"><span className="result-label">Assembly:</span><span className="result-value">{result.acName}</span></div>}
    </div>
  );
}

export default function SDMLocator() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!query.trim()) { setError('Please enter a locality name'); setResult(null); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const response = await api.get('/sdm/search', { params: { q: query } });
      setResult(response.data);
    } catch (err) {
      setError(err?.response?.status === 404 ? 'Locality not found in official MCD ward records' : (err?.response?.data?.message || 'Failed to connect to server. Please check your connection.'));
    } finally { setLoading(false); }
  };

  const office = result?.sdmOffice;
  const mapTarget = office?.coordinates ? `${office.coordinates.latitude},${office.coordinates.longitude}` : office?.address;

  return (
    <div className="sdm-locator-container"><div className="sdm-locator-card">
      <h1>Find Your SDM Office</h1>
      <p className="subtitle">Enter a locality to find its MCD ward, SDM jurisdiction, and corresponding SDM office.</p>
      <form onSubmit={handleSearch} className="sdm-search-form"><div className="search-group">
        <input type="text" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter locality name (e.g., Narela, Burari, Kalkaji)" className="sdm-search-input" disabled={loading} />
        <button type="submit" className="sdm-search-btn" disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
      </div></form>
      {error && <div className="sdm-error-message"><span className="error-icon">⚠️</span>{error}</div>}
      {result?.mappingStatus === 'available' && <div className="sdm-result-card">
        <div className="result-header"><h2>✓ SDM Office Found</h2></div>
        <div className="result-details">
          <div className="office-primary"><div className="result-label">SDM Office</div><div className="office-name">{office.name}</div></div>
          <div className="result-row"><span className="result-label">Jurisdiction:</span><span className="result-value">{result.sdmJurisdiction.subDivision} ({result.sdmJurisdiction.area})</span></div>
          {office.address && <div className="result-row result-row-stacked"><span className="result-label">Office address:</span><span className="result-value">{office.address}</span></div>}
          {(office.contact.phone || office.contact.email) && <div className="result-row result-row-stacked"><span className="result-label">Contact information:</span><span className="result-value">{office.contact.phone}{office.contact.phone && office.contact.email && <br />}{office.contact.email && <a href={`mailto:${office.contact.email}`}>{office.contact.email}</a>}</span></div>}
          {mapTarget && <div className="map-actions"><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapTarget)}`} target="_blank" rel="noreferrer">View on Map</a></div>}
          <MappingDetails result={result} />
          <div className="official-note">
            <strong>How was this determined?</strong> This mapping follows project records that link Locality → MCD Ward
            → SDM Sub-Division → SDM Office using official Delhi ward delimitation and SDM jurisdiction datasets.
          </div>
        </div>
      </div>}
      {result?.mappingStatus === 'unavailable' && <div className="sdm-unavailable-message"><h2>SDM office mapping unavailable</h2><p>{result.mappingUnavailableReason}</p><MappingDetails result={result} /></div>}
      {!result && !error && query && !loading && <div className="sdm-info-message">Click "Search" to find the SDM office for this locality</div>}
    </div></div>
  );
}
