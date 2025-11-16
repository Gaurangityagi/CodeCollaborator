import React, { useEffect, useRef, useState } from "react";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/hint/show-hint";
import "./show-hint.css";
import CodeMirror from "codemirror";

import { ACTIONS } from "../Actions";
import { aiSuggest } from "./aiSuggest";

// Simple hash function to generate consistent colors
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

const getColorFromUsername = (username) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F1948A', '#82E0AA', '#F8C471', '#AED6F1', '#D7BDE2', '#A3E4D7', '#FAD7A0', '#C39BD3', '#A9DFBF', '#F4D03F',
    '#58D68D', '#5DADE2', '#AF7AC5', '#F8C471', '#85C1E9', '#82E0AA', '#EC7063', '#AED6F1', '#D7BDE2', '#A9DFBF'
  ];
  // Ensure username is a string and not null/undefined
  const safeUsername = String(username || 'anonymous');
  const hash = hashString(safeUsername);
  const colorIndex = Math.abs(hash) % colors.length;
  console.log(`Color for ${safeUsername}: ${colors[colorIndex]} (index: ${colorIndex})`);
  return colors[colorIndex];
};

function Editor({ socketRef, roomId, onCodeChange, isJoined, username, selectedLanguage }) {
  const editorRef = useRef(null);
  const emitTimeout = useRef(null);
  const cursorTimeoutRef = useRef(null);
  const [aiOutput, setAiOutput] = useState("");
  const remoteCursors = useRef({});

  useEffect(() => {
    const init = async () => {
      const editor = CodeMirror.fromTextArea(document.getElementById("realtimeEditor"), {
        mode: { name: "javascript", json: true },
        theme: "dracula",
        autoCloseTags: true,
        autoCloseBrackets: true,
        lineNumbers: true,
        extraKeys: {
          "Ctrl-Space": async function (cm) {
            await showAISuggestion(cm);
          },
        },
      });

      // expose editor globally so EditorPage can access and so SYNC flows will work
      window.editorInstance = editor;
      editorRef.current = editor;
      editor.setSize(null, "100%");

      editor.on("change", (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();

        // local canonical store
        if (typeof onCodeChange === "function") onCodeChange(code);

        // ignore programmatic updates
        if (origin === "setValue") return;

        // only emit code changes when the user is actually approved/joined
        if (!isJoined) return;

        // debounce emits
        if (emitTimeout.current) clearTimeout(emitTimeout.current);
        emitTimeout.current = setTimeout(() => {
          try {
            if (socketRef && socketRef.current && socketRef.current.connected) {
              socketRef.current.emit(ACTIONS.CODE_CHANGE, { roomId, code });
            }
          } catch (e) {
            console.error("Emit CODE_CHANGE failed", e);
          }
        }, 300);
      });

      // Track cursor movements with debouncing to reduce lag
      editor.on("cursorActivity", (instance) => {
        if (!isJoined) return;
        const cursorPos = instance.getCursor();

        // Clear previous timeout
        if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);

        // Debounce cursor updates to reduce server load
        cursorTimeoutRef.current = setTimeout(() => {
          try {
            if (socketRef && socketRef.current && socketRef.current.connected) {
              socketRef.current.emit(ACTIONS.CURSOR_UPDATE, { roomId, cursorPos, username });
            }
          } catch (e) {
            console.error("Emit CURSOR_UPDATE failed", e);
          }
        }, 100); // 100ms debounce
      });
    };

    init();

    // cleanup
    return () => {
      if (emitTimeout.current) clearTimeout(emitTimeout.current);
      if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);
      // Clear all remote cursors
      Object.values(remoteCursors.current).forEach(cursor => {
        if (cursor && cursor.clear) {
          cursor.clear();
        }
      });
      remoteCursors.current = {};
      if (editorRef.current) {
        try {
          editorRef.current.toTextArea();
        } catch (e) {}
      }
      if (window.editorInstance) window.editorInstance = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, isJoined, username]);

  // listen for code changes from server
  useEffect(() => {
    const socket = socketRef ? socketRef.current : null;
    if (!socket) return;

    const onCodeChangeFromServer = ({ code }) => {
      try {
        if (!editorRef.current) return;
        const current = editorRef.current.getValue();
        if (code != null && code !== current) {
          editorRef.current.setValue(code); // origin = setValue, ignored by change handler
          if (typeof onCodeChange === "function") onCodeChange(code);
        }
      } catch (e) {
        console.error("Error applying remote code:", e);
      }
    };

    const onSyncRequest = ({ socketId }) => {
      // server asked this client to send canonical code to socketId requester
      try {
        const code = editorRef.current ? editorRef.current.getValue() : "";
        socket.emit(ACTIONS.SYNC_CODE, { socketId, code });
      } catch (e) {
        console.error("Error sending SYNC_CODE", e);
      }
    };

    socket.on(ACTIONS.CODE_CHANGE, onCodeChangeFromServer);
    socket.on(ACTIONS.SYNC_CODE, onSyncRequest);

    // Listen for cursor updates
    const onCursorUpdate = ({ cursorPos, username: remoteUsername }) => {
      console.log("Received CURSOR_UPDATE:", { cursorPos, username: remoteUsername }); // Debug log
      if (!editorRef.current || remoteUsername === username) return; // ignore own cursor
      const color = getColorFromUsername(remoteUsername);
      const cursorId = `cursor-${remoteUsername}`;

      // Remove existing cursor for this user
      if (remoteCursors.current[cursorId]) {
        remoteCursors.current[cursorId].clear();
      }

      // Create a single widget that contains both cursor and label
      const cursorContainer = document.createElement('div');
      cursorContainer.style.cssText = `
        position: relative;
        display: inline-block;
        width: 0;
        height: 1.2em;
        vertical-align: top;
      `;

      // Create the cursor line
      const cursorLine = document.createElement('div');
      cursorLine.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        width: 2px;
        height: 100%;
        background-color: ${color};
        z-index: 10;
        pointer-events: none;
      `;

      // Create the username label
      const labelElement = document.createElement('div');
      labelElement.textContent = remoteUsername;
      labelElement.style.cssText = `
        position: absolute;
        left: 0;
        top: -20px;
        background-color: ${color};
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 12px;
        font-weight: bold;
        white-space: nowrap;
        z-index: 11;
        pointer-events: none;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        transform: translateX(-50%);
      `;

      cursorContainer.appendChild(cursorLine);
      cursorContainer.appendChild(labelElement);

      // Use setBookmark for precise positioning at the exact character
      const bookmark = editorRef.current.setBookmark(cursorPos, {
        widget: cursorContainer,
        insertLeft: true  // Insert to the left of the character
      });

      remoteCursors.current[cursorId] = {
        bookmark: bookmark,
        element: cursorContainer,
        clear: () => {
          bookmark.clear();
        }
      };

      console.log("Added colored cursor with name for", remoteUsername, "at", cursorPos); // Debug log

      // Auto-remove after 3 seconds of inactivity
      setTimeout(() => {
        if (remoteCursors.current[cursorId]) {
          remoteCursors.current[cursorId].clear();
          delete remoteCursors.current[cursorId];
          console.log("Removed cursor for", remoteUsername); // Debug log
        }
      }, 3000);
    };

    socket.on(ACTIONS.CURSOR_UPDATE, onCursorUpdate);

    return () => {
      socket.off(ACTIONS.CODE_CHANGE, onCodeChangeFromServer);
      socket.off(ACTIONS.SYNC_CODE, onSyncRequest);
      socket.off(ACTIONS.CURSOR_UPDATE, onCursorUpdate);
    };
  }, [socketRef, username, onCodeChange]);

  // AI suggestion helper
  const showAISuggestion = async (cm) => {
    try {
      const code = cm.getValue();
      // Use the selectedLanguage prop passed from EditorPage
      const suggestions = await aiSuggest(code, selectedLanguage);
      if (!suggestions || !suggestions.length) return;

      // Create a custom hint function that shows suggestions in a dropdown
      const hintFunction = () => {
        const cursor = cm.getCursor();
        return {
          from: cursor,
          to: cursor,
          list: suggestions.filter((s) => s && s.trim()).map((suggestion, index) => ({
            text: suggestion,
            displayText: `${index + 1}. ${suggestion}`,
            hint: (cm, data, completion) => {
              // Insert the selected suggestion
              cm.replaceRange(completion.text, data.from, data.to);
            }
          })),
        };
      };

      cm.showHint({
        hint: hintFunction,
        completeSingle: false, // Don't auto-complete on single match
        alignWithWord: false,
      });
    } catch (error) {
      console.error("AI suggestion error", error);
    }
  };

  // AI functions unchanged (explain/refactor/analyze) — keep same as you had
  const explainCode = async () => {
    const code = editorRef.current.getValue();
    if (!code.trim()) {
      alert("No code to explain.");
      return;
    }
    try {
      const res = await fetch("http://localhost:5000/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeSnippet: code }),
      });
      const data = await res.json();
      setAiOutput(data.explanation || "Unable to explain this code.");
    } catch (error) {
      console.error("Error fetching explanation:", error);
      alert("Error loading explanation.");
    }
  };

  const refactorCode = async () => {
    const code = editorRef.current.getValue();
    if (!code.trim()) {
      alert("No code to refactor.");
      return;
    }
    try {
      const res = await fetch("http://localhost:5000/api/ai/refactor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeSnippet: code }),
      });
      const data = await res.json();
      if (data.refactoredCode) {
        editorRef.current.setValue(data.refactoredCode);
        alert("Code refactored successfully!");
      } else {
        alert("Unable to refactor this code.");
      }
    } catch (error) {
      console.error("Error fetching refactored code:", error);
      alert("Error loading refactored code.");
    }
  };

  const analyzeComplexity = async () => {
    const code = editorRef.current.getValue();
    if (!code.trim()) {
      alert("No code to analyze.");
      return;
    }
    try {
      const res = await fetch("http://localhost:5000/api/ai/complexity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeSnippet: code }),
      });
      const data = await res.json();
      setAiOutput(data.complexityAnalysis || "Unable to analyze complexity.");
    } catch (error) {
      console.error("Error fetching complexity analysis:", error);
      alert("Error loading complexity analysis.");
    }
  };

  return (
    <div style={{ height: "600px" }}>
      <textarea id="realtimeEditor" />
      <button onClick={explainCode} style={{ marginTop: "10px", padding: "8px 16px", background: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
        Code Explanation
      </button>
      <button onClick={refactorCode} style={{ marginTop: "10px", marginLeft: "10px", padding: "8px 16px", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
        Refactor Code
      </button>
      <button onClick={analyzeComplexity} style={{ marginTop: "10px", marginLeft: "10px", padding: "8px 16px", background: "#ffc107", color: "black", border: "none", borderRadius: "4px", cursor: "pointer" }}>
        Complexity Analysis
      </button>
      <div className="text-muted mt-2" style={{ fontSize: "0.85rem" }}>
        Press <strong>Ctrl+Space</strong> to get AI code suggestions!
      </div>
      {aiOutput && (
        <div style={{ marginTop: 12, padding: 10, border: "1px solid #ccc", borderRadius: 4 }}>
          <h4>Output:</h4>
          <pre style={{ whiteSpace: "pre-wrap" }}>{aiOutput}</pre>
        </div>
      )}
    </div>
  );
}

export default Editor;
