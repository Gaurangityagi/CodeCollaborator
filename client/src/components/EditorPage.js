import React, { useEffect, useRef, useState } from "react";
import Client from "./Client";
import Editor from "./Editor";
import Suggestions from "./Suggestions";
import TodoList from "./TodoList";
import { initSocket } from "../Socket";
import { ACTIONS } from "../Actions";
import { useNavigate, useLocation, Navigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";

const LANGUAGES = [
  "python3", "java", "cpp", "nodejs", "c#", "ruby", "go", "scala",
  "bash", "sql", "pascal", "csharp", "php", "swift", "rust", "r",
];

function EditorPage() {
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [isCompileWindowOpen, setIsCompileWindowOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("python3");
  const [roomLanguage, setRoomLanguage] = useState("python3");

  // canonical code store
  const codeRef = useRef("");

  // admin / join request state
  const [joinRequests, setJoinRequests] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const isAdminRef = useRef(isAdmin);
  useEffect(() => { isAdminRef.current = isAdmin; }, [isAdmin]);

  // joined flag
  const [isJoined, setIsJoined] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const socketRef = useRef(null);

  // read potential initial data passed from Home after approval
  const initialClientsFromState = location?.state?.initialClients || null;
  const initialCodeFromState = (typeof location?.state?.initialCode !== "undefined") ? location.state.initialCode : null;
  const cameFromApproval = Boolean(location?.state?.fromApproval);

  useEffect(() => {
    // guard: ensure username passed from previous page
    if (!location?.state?.username) {
      navigate("/");
      return;
    }

    let mounted = true;

    const init = async () => {
      // load saved code from DB (optional)
      try {
        const response = await axios.get(`http://localhost:5000/code/${roomId}`);
        if (response.data?.code) {
          // only set if we don't already have initial code from approval
          if (initialCodeFromState === null) {
            codeRef.current = response.data.code;
          }
        }
      } catch (err) {
        console.log("No saved code found for this room yet.");
      }

      // Check if user is admin for this room
      try {
        const encodedUsername = encodeURIComponent(location.state.username.trim());
        const adminResponse = await axios.get(`http://localhost:5000/is-admin/${roomId}/${encodedUsername}`);
        if (adminResponse.data?.isAdmin) {
          setIsAdmin(true);
        }
      } catch (err) {
        console.log("Could not check admin status:", err);
      }

      // init socket
      socketRef.current = initSocket();
      const socket = socketRef.current;

      socket.on("connect", () => console.log("Socket connected", socket.id));
      socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
        toast.error("Socket connection failed");
        navigate("/");
      });

      socket.on("admin-status", ({ isAdmin: adminFlag }) => {
        setIsAdmin(Boolean(adminFlag));
      });

      socket.on(ACTIONS.JOIN_REQUEST, ({ requesterId, requesterName, roomId: reqRoom }) => {
        if (isAdminRef.current) {
          setJoinRequests((prev) => {
            const exists = prev.some((r) => r.requesterId === requesterId);
            return exists ? prev : [...prev, { requesterId, requesterName, roomId: reqRoom }];
          });
        }
      });

      socket.on(ACTIONS.REMOVE_JOIN_REQUEST, ({ requesterId }) => {
        setJoinRequests((prev) => prev.filter((r) => r.requesterId !== requesterId));
      });

    
      socket.on("join-approved", ({ roomId: approvedRoom }) => {
       
        toast.success("Join approved by admin");
      });

      socket.on("join-denied", () => {
        toast.error("Permission not granted by admin.");
        navigate("/");
      });

     
      socket.on(ACTIONS.JOINED, ({ clients: joinedClients, username, socketId, roomLanguage: lang }) => {
        setClients(joinedClients || []);
        if (lang) setRoomLanguage(lang);

        if (socketRef.current && socketId === socketRef.current.id) {
          setIsJoined(true);

          if (codeRef.current) {
            socket.emit(ACTIONS.SYNC_CODE, { socketId: null, code: codeRef.current });
          }
        }
        if (username !== location.state.username) {
          toast.success(`${username} joined the room.`);
        }
      });

      
      socket.on(ACTIONS.SYNC_CODE, ({ socketId }) => {
        
        socket.emit(ACTIONS.SYNC_CODE, {
          socketId,
          code: codeRef.current || (window.editorInstance ? window.editorInstance.getValue() : ""),
        });
      });

    
      socket.on(ACTIONS.CODE_CHANGE, ({ code }) => {
        if (code != null && codeRef.current !== code) {
          codeRef.current = code;

          if (window.editorInstance) {

            window.editorInstance.setValue(code);
          }
        }
      });

      socket.on(ACTIONS.LANGUAGE_CHANGE, ({ language }) => {
        setRoomLanguage(language);
      });

      socket.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast(`${username} left the room.`);
        setClients((prev) => prev.filter((c) => c.socketId !== socketId));
      });

      if (initialClientsFromState) {
        setClients(initialClientsFromState);
      }
      if (initialCodeFromState !== null) {
        codeRef.current = initialCodeFromState;
        if (window.editorInstance) {
          window.editorInstance.setValue(initialCodeFromState);
        }
      }
      if (cameFromApproval || (Array.isArray(initialClientsFromState) && initialClientsFromState.length > 0)) {
  setIsJoined(true);
  console.log("Arrived after approval — marking as joined so realtime emits will work");
}
     
      const haveInitialClients = Array.isArray(initialClientsFromState) && initialClientsFromState.length > 0;
      if (!cameFromApproval && !haveInitialClients) {
        socket.emit(ACTIONS.JOIN, { roomId, username: location.state.username.trim() });
      } else {
        console.log("Skipping emit JOIN from EditorPage (arrived after approval or with initial clients).");

      }
    };

    init();

    return () => {
      mounted = false;
      if (socketRef.current) {
        try {
          socketRef.current.off("connect");
          socketRef.current.off("connect_error");
          socketRef.current.off("admin-status");
          socketRef.current.off(ACTIONS.JOIN_REQUEST);
          socketRef.current.off(ACTIONS.REMOVE_JOIN_REQUEST);
          socketRef.current.off("join-approved");
          socketRef.current.off("join-denied");
          socketRef.current.off(ACTIONS.JOINED);
          socketRef.current.off(ACTIONS.SYNC_CODE);
          socketRef.current.off(ACTIONS.CODE_CHANGE);
          socketRef.current.off(ACTIONS.DISCONNECTED);
          socketRef.current.disconnect();
        } catch (e) {
          // ignore
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, location?.state?.username, navigate]);

  if (!location.state) return <Navigate to="/" />;

  const handleDecision = (requesterId, _roomId, decision) => {
    if (!socketRef.current) return;
    socketRef.current.emit(ACTIONS.JOIN_DECISION, { requesterId, decision, roomId });
    setJoinRequests((prev) => prev.filter((req) => req.requesterId !== requesterId));
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID copied!");
    } catch (err) {
      toast.error("Failed to copy Room ID");
    }
  };

  const leaveRoom = () => {
    // optionally emit leave event if backend handles it; for now just navigate away
    navigate("/");
  };

  const runCode = async () => {
    setIsCompiling(true);
    try {
      const response = await axios.post("http://localhost:5000/compile", {
        code: codeRef.current,
        language: roomLanguage,
      });
      setOutput(response.data.output || JSON.stringify(response.data));
    } catch (err) {
      setOutput(err.response?.data?.error || "An error occurred");
    } finally {
      setIsCompiling(false);
    }
  };

  const toggleCompileWindow = () => setIsCompileWindowOpen(!isCompileWindowOpen);

  const saveCodeToDB = async () => {
    try {
      await axios.post("http://localhost:5000/save", {
        roomId,
        code: codeRef.current,
      });
      toast.success("Code saved successfully!");
    } catch {
      toast.error("Failed to save code");
    }
  };

  return (
    <div className="container-fluid vh-100 d-flex flex-column">
      {isAdmin && joinRequests.length > 0 && (
        <div style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          backgroundColor: "#222",
          color: "white",
          padding: "20px",
          borderRadius: "10px",
          zIndex: 2000,
          width: "260px",
        }}>
          <h5>Join Requests</h5>
          {joinRequests.map((req) => (
            <div key={req.requesterId} style={{ marginBottom: "10px" }}>
              <p>{req.requesterName} wants to join</p>
              <div className="d-flex justify-content-between">
                <button className="btn btn-success btn-sm me-2" onClick={() => handleDecision(req.requesterId, req.roomId, "allow")}>Allow</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDecision(req.requesterId, req.roomId, "deny")}>Deny</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="row flex-grow-1">
        <div className="col-md-2 bg-dark text-light d-flex flex-column">
          <img src="/images/codesync.png" alt="Logo" className="img-fluid mx-auto" style={{ maxWidth: "150px", marginTop: "-43px" }} />
          <hr style={{ marginTop: "-3rem" }} />
          <div className="d-flex flex-column flex-grow-1 overflow-auto">
            <span className="mb-2">Members</span>
            {clients.map((client) => (<Client key={client.socketId} username={client.username} />))}
          </div>
          <hr />
          <div className="mt-auto mb-3">
            <button className="btn btn-success w-100 mb-2" onClick={copyRoomId}>Copy Room ID</button>
            <button className="btn btn-warning w-100 mb-2" onClick={saveCodeToDB}>Save Code</button>
            <button className="btn btn-danger w-100" onClick={leaveRoom}>Leave Room</button>
          </div>
        </div>

        <div className="col-md-10 text-light d-flex flex-column">
          <div className="bg-dark p-2 d-flex justify-content-end">
            <select className="form-select w-auto" value={roomLanguage} onChange={(e) => {
              const newLang = e.target.value;
              setRoomLanguage(newLang);
              if (socketRef.current) {
                socketRef.current.emit(ACTIONS.LANGUAGE_CHANGE, { roomId, language: newLang });
              }
            }}>
              {LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
            </select>
          </div>

          <div className="d-flex flex-grow-1">
            <div className="flex-grow-1">
              <Editor
                socketRef={socketRef}
                roomId={roomId}
                onCodeChange={(code) => { codeRef.current = code; /* Editor itself emits CODE_CHANGE when isJoined */ }}
                isJoined={isJoined}
                username={location.state.username}
                selectedLanguage={roomLanguage}
              />
            </div>

            <div className="d-flex flex-column" style={{ width: "300px", marginLeft: "10px" }}>
              <Suggestions socketRef={socketRef} roomId={roomId} username={location.state.username} />
              <TodoList socketRef={socketRef} roomId={roomId} username={location.state.username} />
            </div>
          </div>
        </div>
      </div>

      <button className="btn btn-primary position-fixed bottom-0 end-0 m-3" onClick={toggleCompileWindow} style={{ zIndex: 1050 }}>
        {isCompileWindowOpen ? "Close Compiler" : "Open Compiler"}
      </button>

      <div className={`bg-dark text-light p-3 ${isCompileWindowOpen ? "d-block" : "d-none"}`} style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: isCompileWindowOpen ? "30vh" : "0", transition: "height 0.3s ease-in-out", overflowY: "auto", zIndex: 1040 }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="m-0">Compiler Output ({roomLanguage})</h5>
          <div>
            <button className="btn btn-success me-2" onClick={runCode} disabled={isCompiling}>{isCompiling ? "Compiling..." : "Run Code"}</button>
            <button className="btn btn-secondary" onClick={toggleCompileWindow}>Close</button>
          </div>
        </div>
        <pre className="bg-secondary p-3 rounded" style={{ whiteSpace: "pre-wrap" }}>{output || "Output will appear here after compilation"}</pre>
      </div>
    </div>
  );
}

export default EditorPage;
