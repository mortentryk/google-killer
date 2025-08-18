import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const [searchHistory, setSearchHistory] = useState([]);
  const navigate = useNavigate();

  // Load search history from localStorage
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem("searchHistory")) || [];
    setSearchHistory(history);
  }, []);

  // Navigate to mind-map with the selected query
  const handleSelectQuery = (query) => {
    navigate(`/?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="landing-page">
      <h1>Mind-Map Search</h1>
      <p>Explore topics as mind-maps. Here are your recent searches:</p>
      <input
        type="text"
        placeholder="Search for a new topic..."
        onKeyPress={(e) => {
          if (e.key === "Enter" && e.target.value.trim()) {
            handleSelectQuery(e.target.value.trim());
          }
        }}
      />
      <div className="search-history">
        <h2>Recent Searches</h2>
        {searchHistory.length === 0 ? (
          <p>No searches yet. Try searching for "dog food" or "cat litter"!</p>
        ) : (
          <ul>
            {searchHistory.map((query, index) => (
              <li key={index}>
                <button onClick={() => handleSelectQuery(query)}>
                  {query}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
