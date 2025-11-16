// import React, { useState } from "react";
// import { v4 as uuid } from "uuid";
// import toast from "react-hot-toast";
// import { useNavigate } from "react-router-dom";

// function Home() {
//   const [roomId, setRoomId] = useState("");
//   const [username, setUsername] = useState("");

//   const navigate = useNavigate();

//   const generateRoomId = (e) => {
//     e.preventDefault();
//     const Id = uuid();
//     setRoomId(Id);
//     toast.success("Room Id is generated");
//   };

//   const joinRoom = () => {
//     if (!roomId || !username) {
//       toast.error("Both the field is requried");
//       return;
//     }

//     navigate(`/editor/${roomId}`, {
//       state: {
//         username,
//       },
//     });
//     toast.success("room is created");
//   };


//   const handleInputEnter = (e) => {
//     if (e.code === "Enter") {
//       joinRoom();
//     }
//   };

//   return (
//     <div className="container-fluid">
//       <div className="row justify-content-center align-items-center min-vh-100">
//         <div className="col-12 col-md-6">
//           <div className="card shadow-sm p-2 mb-5 bg-secondary rounded">
//             <div className="card-body text-center bg-dark">
//               <img
//                 src="/images/codesync.png"
//                 alt="Logo"
//                 className="img-fluid mx-auto d-block"
//                 style={{ maxWidth: "150px" }}
//               />
//               <h4 className="card-title text-light mb-4">Enter the ROOM ID</h4>

//               <div className="form-group">
//                 <input
//                   type="text"
//                   value={roomId}
//                   onChange={(e) => setRoomId(e.target.value)}
//                   className="form-control mb-2"
//                   placeholder="ROOM ID"
//                   onKeyUp={handleInputEnter}
//                 />
//               </div>
//               <div className="form-group">
//                 <input
//                   type="text"
//                   value={username}
//                   onChange={(e) => setUsername(e.target.value)}
//                   className="form-control mb-2"
//                   placeholder="USERNAME"
//                   onKeyUp={handleInputEnter}
//                 />
//               </div>
//               <button
//                 onClick={joinRoom}
//                 className="btn btn-success btn-lg btn-block"
//               >
//                 JOIN
//               </button>
//               <p className="mt-3 text-light">
//                 Don't have a room ID? create{" "}
//                 <span
//                   onClick={generateRoomId}
//                   className=" text-success p-2"
//                   style={{ cursor: "pointer" }}
//                 >
//                   {" "}
//                   New Room
//                 </span>
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Home;

// Home.jsx
// Home.jsx (only small changes from your existing file)
// import React, { useEffect, useRef, useState } from "react";
// import { v4 as uuid } from "uuid";
// import toast from "react-hot-toast";
// import { useNavigate } from "react-router-dom";
// import { initSocket } from "../Socket"; // if you use shared socket approach
// import { ACTIONS } from "../Actions";

// function Home() {
//   const [roomId, setRoomId] = useState("");
//   const [username, setUsername] = useState("");
//   const [isCreator, setIsCreator] = useState(false); // <-- new flag
//   const socketRef = useRef(null);
//   const navigate = useNavigate();

//   useEffect(() => {
//     // init shared socket (optional — recommended if using approval-wait flow)
//     socketRef.current = initSocket();

//     // If using emit-from-home flow for join requests, listen for approval here
//     const onApproved = ({ roomId: approvedRoom }) => {
//       toast.success("Join approved — opening editor");
//       navigate(`/editor/${approvedRoom}`, { state: { username } });
//     };
//     const onDenied = () => {
//       toast.error("Join denied by admin");
//     };

//     socketRef.current.on("join-approved", onApproved);
//     socketRef.current.on("join-denied", onDenied);

//     return () => {
//       try {
//         socketRef.current.off("join-approved", onApproved);
//         socketRef.current.off("join-denied", onDenied);
//       } catch (e) {}
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [navigate, username]);

//   const generateRoomId = (e) => {
//     e.preventDefault();
//     const Id = uuid();
//     setRoomId(Id);
//     setIsCreator(true); // mark as creator
//     toast.success("Room Id is generated — you're the creator");
//   };

//   const joinRoom = () => {
//     if (!roomId || !username) {
//       toast.error("Both the fields are required");
//       return;
//     }

//     if (isCreator) {
//       // Creator: navigate immediately to editor; EditorPage will JOIN and become admin
//       navigate(`/editor/${roomId}`, {
//         state: { username, isCreator: true },
//       });
//       toast.success("Room created — opening editor");
//       // reset flag so future joins behave normally
//       setIsCreator(false);
//       return;
//     }

//     // Not creator: send join request and wait for approval
//     try {
//       socketRef.current.emit(ACTIONS.JOIN, { roomId, username });
//       toast.success("Join request sent — waiting for admin approval");
//     } catch (err) {
//       console.error("Join emit failed", err);
//       toast.error("Unable to send join request");
//     }
//   };

//   const handleInputEnter = (e) => {
//     if (e.code === "Enter") {
//       joinRoom();
//     }
//   };

//   return (
//     // ... your existing JSX unchanged ...
//     <div className="container-fluid">
//       <div className="row justify-content-center align-items-center min-vh-100">
//         <div className="col-12 col-md-6">
//           <div className="card shadow-sm p-2 mb-5 bg-secondary rounded">
//             <div className="card-body text-center bg-dark">
//               <img
//                 src="/images/codesync.png"
//                 alt="Logo"
//                 className="img-fluid mx-auto d-block"
//                 style={{ maxWidth: "150px" }}
//               />
//               <h4 className="card-title text-light mb-4">Enter the ROOM ID</h4>

//               <div className="form-group">
//                 <input
//                   type="text"
//                   value={roomId}
//                   onChange={(e) => { setRoomId(e.target.value); setIsCreator(false); }}
//                   className="form-control mb-2"
//                   placeholder="ROOM ID"
//                   onKeyUp={handleInputEnter}
//                 />
//               </div>
//               <div className="form-group">
//                 <input
//                   type="text"
//                   value={username}
//                   onChange={(e) => setUsername(e.target.value)}
//                   className="form-control mb-2"
//                   placeholder="USERNAME"
//                   onKeyUp={handleInputEnter}
//                 />
//               </div>
//               <button
//                 onClick={joinRoom}
//                 className="btn btn-success btn-lg btn-block"
//               >
//                 JOIN
//               </button>
//               <p className="mt-3 text-light">
//                 Don't have a room ID? create{" "}
//                 <span
//                   onClick={generateRoomId}
//                   className=" text-success p-2"
//                   style={{ cursor: "pointer" }}
//                 >
//                   {" "}
//                   New Room
//                 </span>
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Home;

import React, { useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { initSocket } from "../Socket";
import { ACTIONS } from "../Actions";

function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [isCreator, setIsCreator] = useState(false);

  const socketRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    socketRef.current = initSocket();

    // ******** MAIN CHANGE HERE ********
    const onApproved = ({ roomId: approvedRoom, clients, code }) => {
      toast.success("Join approved!");

      navigate(`/editor/${approvedRoom}`, {
        state: {
          username,
          fromApproval: true,        // <-- IMPORTANT
          initialClients: clients || [],
          initialCode: code || "",
        },
      });
    };

    const onDenied = () => {
      toast.error("Join Request Denied");
    };

    socketRef.current.on("join-approved", onApproved);
    socketRef.current.on("join-denied", onDenied);

    return () => {
      try {
        socketRef.current.off("join-approved", onApproved);
        socketRef.current.off("join-denied", onDenied);
      } catch (e) {}
    };
  }, [username, navigate]);

  const generateRoomId = (e) => {
    e.preventDefault();
    const Id = uuid();
    setRoomId(Id);
    setIsCreator(true);
    toast.success("Room ID Generated! You are admin.");
  };

  // const joinRoom = () => {
  //   if (!roomId || !username) {
  //     toast.error("Both fields required");
  //     return;
  //   }

  //   if (isCreator) {
  //     navigate(`/editor/${roomId}`, {
  //       state: { username, isCreator: true },
  //     });
  //     toast.success("Room created");
  //     setIsCreator(false);
  //     return;
  //   }
    
  //   // ********** SEND SINGLE JOIN REQUEST *********
  //   socketRef.current.emit(ACTIONS.JOIN, { roomId, username });
  //   toast("Join request sent — waiting for admin...");
  // };
const joinRoom = () => {
  if (!roomId || !username) {
    toast.error("Both fields required");
    return;
  }

  if (isCreator) {
    // optional: persist admin name locally for convenience (REMOVE if you don't want autofill)
    // try { localStorage.setItem(`codesync_adminName_${roomId}`, username); } catch (e) {}

    navigate(`/editor/${roomId}`, {
      state: { username, isCreator: true },
    });
    toast.success("Room created");
    setIsCreator(false);
    return;
  }

  // --- DEBUG: log what we're about to send
  console.log("Home: emitting JOIN", { roomId, username });

  // ensure socket connected
  if (!socketRef.current || !socketRef.current.connected) {
    toast.error("Socket not connected. Try reloading the page.");
    console.error("Socket not ready:", socketRef.current);
    return;
  }

  // send single join request with exact username string (no normalization)
  socketRef.current.emit(ACTIONS.JOIN, { roomId, username });
  toast("Join request sent — waiting for admin...");
};

  const handleInputEnter = (e) => {
    if (e.code === "Enter") joinRoom();
  };

  return (
    <div className="container-fluid">
      <div className="row justify-content-center align-items-center min-vh-100">
        <div className="col-12 col-md-6">
          <div className="card shadow-sm p-2 mb-5 bg-secondary rounded">
            <div className="card-body text-center bg-dark">
              <img
                src="/images/codesync.png"
                alt="Logo"
                className="img-fluid mx-auto d-block"
                style={{ maxWidth: "150px" }}
              />

              <h4 className="card-title text-light mb-4">Enter the ROOM ID</h4>

              <input
                type="text"
                value={roomId}
                onChange={(e) => {
                  setRoomId(e.target.value);
                  setIsCreator(false);
                }}
                className="form-control mb-2"
                placeholder="ROOM ID"
                onKeyUp={handleInputEnter}
              />

              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-control mb-2"
                placeholder="USERNAME"
                onKeyUp={handleInputEnter}
              />

              <button className="btn btn-success btn-lg btn-block" onClick={joinRoom}>
                JOIN
              </button>

              <p className="mt-3 text-light">
                Don't have a room ID? Create
                <span
                  onClick={generateRoomId}
                  className="text-success p-2"
                  style={{ cursor: "pointer" }}
                >
                  New Room
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
