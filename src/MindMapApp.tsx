import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import "./styles.css";

// Keep all your existing interfaces and functions:
// interface Node { ... }
// interface Edge { ... }
// function buildGraphFromQuery(query) { ... }
// function capitalizeWords(s) { ... }
// function getMockContent(label) { ... }

export default function MindMapApp() {
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get("q") || "dog food";
  const [query, setQuery] = useState(queryParam);
  const [searchHistory, setSearchHistory] = useState([]);
  const graph = useMemo(() => buildGraphFromQuery(query), [query]);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState("Links");

  // Load search history
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem("searchHistory")) || [];
    setSearchHistory(history);
  }, []);

  // Save to history
  useEffect(() => {
    if (query.trim()) {
      const updatedHistory = [query, ...searchHistory.filter((q) => q !== query)].slice(0, 10);
      localStorage.setItem("searchHistory", JSON.stringify(updatedHistory));
      setSearchHistory(updatedHistory);
    }
  }, [query]);

  // Keep all your existing SVG and modal logic here
  return (
    <div className="app">
      <header>
        <h1>Mind-Map Search</h1>
        <input
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </header>
      <svg width="100%" height="600">
        {edges.map((e, idx) => {
          const a = nodes.find((n) => n.id === e.from)!;
          const b = nodes.find((n) => n.id === e.to)!;
          return (
            <line
              key={idx}
              x1={a.x + 300}
              y1={a.y + 300}
              x2={b.x + 300}
              y2={b.y + 300}
              stroke="#999"
            />
          );
        })}
        {nodes.map((n) => (
          <g
            key={n.id}
            transform={`translate(${n.x + 300},${n.y + 300})`}
            onClick={() => {
              setSelected(n);
              setActiveTab("Links");
            }}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={-60}
              y={-20}
              width={120}
              height={40}
              rx={10}
              fill="#222"
              stroke="#6c63ff"
            />
            <text textAnchor="middle" fill="#fff" dy="5">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
      {selected && (
        <div className="modal">
          <div className="modal-content">
            <h2>{selected.label}</h2>
            <div className="tabs">
              {["Links", "AI", "Comments", "Video"].map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={activeTab === t ? "active" : ""}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="tab-body">
              <TabContent tab={activeTab} label={selected.label} />
            </div>
            <button onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Keep your TabContent component here too
function TabContent({ tab, label }) {
  // ...
}
