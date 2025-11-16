import React, { useState, useEffect } from "react";

function Suggestions({ socketRef, roomId, username }) {
  const [suggestions, setSuggestions] = useState([]);
  const [newSuggestion, setNewSuggestion] = useState("");

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleNewSuggestion = ({ suggestion, username: suggester }) => {
      setSuggestions(prev => [...prev, { text: suggestion, username: suggester, timestamp: new Date() }]);
    };

    socket.on("NEW_SUGGESTION", handleNewSuggestion);

    return () => {
      socket.off("NEW_SUGGESTION", handleNewSuggestion);
    };
  }, [socketRef.current]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newSuggestion.trim()) {
      // Add to local state immediately
      setSuggestions(prev => [...prev, { text: newSuggestion, username, timestamp: new Date() }]);
      // Emit to other clients
      socketRef.current.emit("ADD_SUGGESTION", { roomId, suggestion: newSuggestion, username });
      setNewSuggestion("");
    }
  };

  return (
    <div style={{ marginTop: "20px", padding: "10px", border: "1px solid #ccc", borderRadius: "4px" }}>
      <h4>ChatBox</h4>
      <form onSubmit={handleSubmit}>
        <textarea
          value={newSuggestion}
          onChange={(e) => setNewSuggestion(e.target.value)}
          placeholder="Suggest a code change..."
          rows="3"
          style={{ width: "100%", marginBottom: "10px" }}
        />
        <button type="submit" style={{ padding: "5px 10px", background: "#007bff", color: "white", border: "none", borderRadius: "4px" }}>
          Send chat
        </button>
      </form>
      <div style={{ marginTop: "10px" }}>
        {suggestions.map((suggestion, index) => (
          <div key={index} style={{ marginBottom: "10px", padding: "5px", backgroundColor: "#f9f9f9", borderRadius: "4px", color: "#000" }}>
            <strong>{suggestion.username}:</strong> {suggestion.text}
            <br />
            <small style={{ color: "#666" }}>{suggestion.timestamp.toLocaleTimeString()}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Suggestions;
