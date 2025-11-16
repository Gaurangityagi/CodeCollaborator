// import {io} from 'socket.io-client';

// export const initSocket = async () =>{
//     const options = {
//         'force new connection': true,
//         reconnectionAttempts : 'Infinity',
//         timeout: 10000,
//         transports: ['websocket'],
//     };
//     return io(process.env.REACT_APP_BACKEND_URL, options);
//}

// import { io } from 'socket.io-client';

// export const initSocket = () => {
//   const options = {
//     'force new connection': true,
//     reconnectionAttempts: Infinity,
//     timeout: 10000,
//     transports: ['websocket'],
//   };
//   return io(process.env.REACT_APP_BACKEND_URL, options);
// };

// Socket.js
// import { io } from "socket.io-client";

// export const initSocket = () => {
//   const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
//   const options = {
//     "force new connection": true,
//     reconnectionAttempts: Infinity,
//     timeout: 10000,
//     transports: ["websocket"],
//   };
//   return io(backendUrl, options);
// };

// Socket.js
import { io } from "socket.io-client";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

export const initSocket = () => {
  // Reuse existing socket if present (prevents duplicate sockets after navigation)
  if (typeof window !== "undefined" && window.__CODESYNC_SOCKET__ && window.__CODESYNC_SOCKET__.connected) {
    return window.__CODESYNC_SOCKET__;
  }

  const options = {
    "force new connection": true,
    reconnectionAttempts: Infinity,
    timeout: 10000,
    transports: ["websocket"],
  };

  const socket = io(BACKEND_URL, options);
  // store globally for reuse
  if (typeof window !== "undefined") {
    window.__CODESYNC_SOCKET__ = socket;
  }
  return socket;
};
