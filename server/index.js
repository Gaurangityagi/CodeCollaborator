import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";

import Code from "./models/Code.js";
import { ACTIONS } from "./Actions.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Atlas Connected"))
  .catch((err) => console.log("Mongo Error:", err));

// --------- AI AUTOCOMPLETE ROUTE (using local model) ----------
app.post("/api/ai/suggest", async (req, res) => {
  const { codeContext, language } = req.body;
  try {
    // Forward to the local autocomplete service with language context
    const response = await axios.post("http://localhost:8080/autocomplete", {
      codeContext: codeContext,
      language: language || "python3"
    });

    // Return multiple suggestions for dropdown
    const suggestions = [];
    if (response.data.suggestion) {
      suggestions.push(response.data.suggestion);
      // Generate 2 more variations by calling again with slightly modified context
      for (let i = 0; i < 2; i++) {
        try {
          const variationResponse = await axios.post("http://localhost:8080/autocomplete", {
            codeContext: codeContext + (i === 0 ? " " : "."),
            language: language || "python3"
          });
          if (variationResponse.data.suggestion && variationResponse.data.suggestion !== response.data.suggestion) {
            suggestions.push(variationResponse.data.suggestion);
          }
        } catch (e) {
          // Ignore variation errors
        }
      }
    }

    res.json({ suggestions: suggestions.slice(0, 3) }); // Max 3 suggestions
  } catch (error) {
    console.error("Local autocomplete service error:", error.response ? error.response.data : error);
    // Fallback to empty suggestions if service is unavailable
    res.json({ suggestions: [] });
  }
});
// --------- END AI AUTOCOMPLETE ROUTE ----------

// --------- AI CODE EXPLANATION ROUTE ----------
app.post("/api/ai/explain", async (req, res) => {
  const { codeSnippet } = req.body;
  try {
    const response = await axios.post(
      "https://22803-mcuvbnt1-eastus2.cognitiveservices.azure.com/openai/deployments/gpt-4.1/chat/completions?api-version=2025-01-01-preview",
      {
        messages: [
          { role: "system", content: "Explain the following code snippet in simple terms. Keep it concise, under 100 words." },
          { role: "user", content: codeSnippet }
        ],
        max_tokens: 100,
        temperature: 0.3
      },
      {
        headers: {
          "api-key": process.env.AZURE_OPENAI_KEY,
          "Content-Type": "application/json"
        }
      }
    );
    let explanation = response.data.choices[0].message.content.trim();
    // Remove any "AI:" prefix, "AI Output:" prefix, and clean special characters
    explanation = explanation.replace(/^AI Output.*$/gm, '').replace(/^AI:\s*/i, '').replace(/^AI\s*/i, '').replace(/['"]/g, '').replace(/\*\*/g, '').trim();
    res.json({ explanation });
  } catch (error) {
    console.error("Azure OpenAI error:", error.response ? error.response.data : error);
    res.status(500).json({ error: error.toString(), details: error.response?.data });
  }
});
// --------- END AI CODE EXPLANATION ROUTE ----------

// --------- AI CODE REFACTORING ROUTE ----------
app.post("/api/ai/refactor", async (req, res) => {
  const { codeSnippet } = req.body;
  try {
    const response = await axios.post(
      "https://22803-mcuvbnt1-eastus2.cognitiveservices.azure.com/openai/deployments/gpt-4.1/chat/completions?api-version=2025-01-01-preview",
      {
        messages: [
          { role: "system", content: "Refactor the following code snippet to improve readability, efficiency, and best practices. Provide only the refactored code without explanations." },
          { role: "user", content: codeSnippet }
        ],
        max_tokens: 500,
        temperature: 0.3
      },
      {
        headers: {
          "api-key": process.env.AZURE_OPENAI_KEY,
          "Content-Type": "application/json"
        }
      }
    );
    res.json({ refactoredCode: response.data.choices[0].message.content });
  } catch (error) {
    console.error("Azure OpenAI error:", error.response ? error.response.data : error);
    res.status(500).json({ error: error.toString(), details: error.response?.data });
  }
});
// --------- END AI CODE REFACTORING ROUTE ----------

// --------- AI CODE COMPLEXITY ANALYSIS ROUTE ----------
app.post("/api/ai/complexity", async (req, res) => {
  const { codeSnippet } = req.body;
  try {
    const response = await axios.post(
      "https://22803-mcuvbnt1-eastus2.cognitiveservices.azure.com/openai/deployments/gpt-4.1/chat/completions?api-version=2025-01-01-preview",
      {
        messages: [
          { role: "system", content: "Analyze the time and space complexity of the following code snippet. Provide final answer for space and time complexity in Big O notation , clear any special characters from the output keep it clean." },
          { role: "user", content: codeSnippet }
        ],
        max_tokens: 200,
        temperature: 0.3
      },
      {
        headers: {
          "api-key": process.env.AZURE_OPENAI_KEY,
          "Content-Type": "application/json"
        }
      }
    );
    let complexityAnalysis = response.data.choices[0].message.content.trim();
    // Remove any "AI:" prefix, "AI Output:" prefix, and clean special characters
    complexityAnalysis = complexityAnalysis.replace(/^AI Output.*$/gm, '').replace(/^AI:\s*/i, '').replace(/^AI\s*/i, '').replace(/['"]/g, '').replace(/\*\*/g, '').trim();
    res.json({ complexityAnalysis });
  } catch (error) {
    console.error("Azure OpenAI error:", error.response ? error.response.data : error);
    res.status(500).json({ error: error.toString(), details: error.response?.data });
  }
});
// --------- END AI CODE COMPLEXITY ANALYSIS ROUTE ----------

  app.post("/save", async (req, res) => {
  const { roomId, code } = req.body;
  try {
    await Code.findOneAndUpdate(
      { roomId },
      { code },
      { upsert: true, new: true }
    );
    res.json({ message: "Code saved to DB" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save code" });
  }
});

app.get("/code/:roomId", async (req, res) => {
  try {
    const room = await Code.findOne({ roomId: req.params.roomId });
    res.json(room || { code: "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: "" });
  }
});

app.get("/is-admin/:roomId/:username", async (req, res) => {
  try {
    const room = await Code.findOne({ roomId: req.params.roomId });
    const trimmedUsername = decodeURIComponent(req.params.username).trim();
    if (room && room.admin && room.admin.toLowerCase() === trimmedUsername.toLowerCase()) {
      res.json({ isAdmin: true });
    } else {
      res.json({ isAdmin: false });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ isAdmin: false });
  }
});


const languageConfig = {
  python3: { versionIndex: "3" },
  java: { versionIndex: "3" },
  cpp: { versionIndex: "4" },
  nodejs: { versionIndex: "3" },
  c: { versionIndex: "4" },
  ruby: { versionIndex: "3" },
  go: { versionIndex: "3" },
  scala: { versionIndex: "3" },
  bash: { versionIndex: "3" },
  sql: { versionIndex: "3" },
  pascal: { versionIndex: "2" },
  csharp: { versionIndex: "3" },
  php: { versionIndex: "3" },
  swift: { versionIndex: "3" },
  rust: { versionIndex: "3" },
  r: { versionIndex: "3" },
};

app.post("/compile", async (req, res) => {
  const { code, language } = req.body;

  try {
    const response = await axios.post("https://api.jdoodle.com/v1/execute", {
      script: code,
      language: language,
      versionIndex: languageConfig[language].versionIndex,
      clientId: process.env.jDoodle_clientId,
      clientSecret: process.env.jDoodle_clientSecret,
    });

    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to compile code" });
  }
});


const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const userSocketMap = {};
const latestCode = {};
const roomLanguages = {}; // Store room languages

const getAllConnectedClients = (roomId) => {
  const room = io.sockets.adapter.rooms.get(roomId);
  if (!room) return [];
  return Array.from(room).map((socketId) => ({
    socketId,
    username: userSocketMap[socketId],
  }));
};

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

socket.on(ACTIONS.JOIN, async ({ roomId, username }) => {
  try {
    console.log("SERVER: JOIN received", { socketId: socket.id, roomId, username });

    // store trimmed username for future (disconnect msgs etc.)
    const trimmedUsername = username.trim();
    userSocketMap[socket.id] = trimmedUsername;

    // fetch room document from DB (if exists)
    let roomDoc = null;
    try {
      roomDoc = await Code.findOne({ roomId }).exec();
      console.log("SERVER: DB roomDoc:", roomDoc ? { roomId: roomDoc.roomId, admin: roomDoc.admin } : null);
    } catch (dbErr) {
      console.error("SERVER: DB lookup error for room:", roomId, dbErr);
    }

    // If room exists and this user is the admin, allow direct join
    if (roomDoc && roomDoc.admin && roomDoc.admin.toLowerCase() === trimmedUsername.toLowerCase()) {
      socket.join(roomId);
      socket.isAdmin = true;

      // ensure latestCode cache has DB code if present
      if (roomDoc.code) latestCode[roomId] = roomDoc.code;

      // Set room language from DB or default
      if (!roomLanguages[roomId]) {
        roomLanguages[roomId] = roomDoc.language || "python3";
      }

      // notify this socket it's admin (existing)
      io.to(socket.id).emit("admin-status", { isAdmin: true });

      // Send join-approved to client to complete the flow
      io.to(socket.id).emit("join-approved", {
        roomId,
        clients: getAllConnectedClients(roomId),
        code: roomDoc.code || "",
        socketId: socket.id,
        username: trimmedUsername,
        roomLanguage: roomLanguages[roomId],
      });

      // also broadcast an ACTIONS.JOINED to the room (keeps clients list consistent)
      io.to(roomId).emit(ACTIONS.JOINED, {
        clients: getAllConnectedClients(roomId),
        username: trimmedUsername,
        socketId: socket.id,
        roomLanguage: roomLanguages[roomId],
      });

      console.log(`Auto-admin join for ${trimmedUsername} into existing room ${roomId}`);
      return;
    }

    // If no exact DB admin match -> if room empty, first joiner becomes admin (persist)
    const existingClients = getAllConnectedClients(roomId);
    const isRoomEmpty = existingClients.length === 0;

    if (isRoomEmpty) {
      socket.join(roomId);
      socket.isAdmin = true;

      // Set default language for the room
      roomLanguages[roomId] = "python3";

      try {
        await Code.findOneAndUpdate(
          { roomId },
          { roomId, admin: trimmedUsername, code: latestCode[roomId] || "", language: roomLanguages[roomId] },
          { upsert: true, new: true }
        ).exec();
        console.log(`SERVER: Stored ${trimmedUsername} as admin for room ${roomId} in DB`);
      } catch (dbErr) {
        console.error("SERVER: Failed to persist admin to DB:", dbErr);
      }

      io.to(socket.id).emit("admin-status", { isAdmin: true });
      io.to(socket.id).emit(ACTIONS.JOINED, {
        clients: getAllConnectedClients(roomId),
        username: trimmedUsername,
        socketId: socket.id,
        roomLanguage: roomLanguages[roomId],
      });

      return;
    }

    // Otherwise: normal join-request flow (ask current admin to approve)
    const adminSocketId = existingClients[0].socketId;
    io.to(adminSocketId).emit(ACTIONS.JOIN_REQUEST, {
      requesterId: socket.id,
      requesterName: trimmedUsername,
      roomId,
    });

    console.log(`SERVER: Emitted join-request for ${trimmedUsername} to admin socket ${adminSocketId}`);
  } catch (err) {
    console.error("SERVER: Error in JOIN handler:", err);
  }
});

  socket.on(ACTIONS.JOIN_DECISION, ({ requesterId, decision, roomId }) => {
    console.log("JOIN_DECISION", { requesterId, decision, roomId });
    const requesterSocket = io.sockets.sockets.get(requesterId);
    const username = userSocketMap[requesterId];

    if (!requesterSocket) {
      const existingClients = getAllConnectedClients(roomId);
      if (existingClients.length > 0) {
        io.to(existingClients[0].socketId).emit(ACTIONS.REMOVE_JOIN_REQUEST, { requesterId });
      }
      return;
    }

    if (decision === "allow") {
      // allow user to join room on server side
      requesterSocket.join(roomId);

      // --- MINIMAL ADDITION: send join-approved with clients + code so requester (Home) gets state immediately
      const clients = getAllConnectedClients(roomId);
      const codeForRoom = latestCode[roomId] !== undefined ? latestCode[roomId] : "";

      io.to(requesterId).emit("join-approved", {
        roomId,
        clients,
        code: codeForRoom,
        socketId: requesterId,
        username: userSocketMap[requesterId] || null,
      });
      // --- end addition

      // Send cached code (if any) to the newly allowed user (backwards-compatible)
      if (latestCode[roomId] !== undefined) {
        io.to(requesterId).emit(ACTIONS.CODE_CHANGE, { code: latestCode[roomId] });
      } else {
        // Ask an existing client (admin) to send their code to this new user
        const existingClients = getAllConnectedClients(roomId);
        const adminSocketId = existingClients[0] && existingClients[0].socketId;
        if (adminSocketId) {
          io.to(adminSocketId).emit(ACTIONS.SYNC_CODE, { socketId: requesterId });
        }
      }

      // Notify everyone in room (including new user). This includes updated clients list.
      io.to(roomId).emit(ACTIONS.JOINED, {
        clients: getAllConnectedClients(roomId),
        username,
        socketId: requesterId,
        roomLanguage: roomLanguages[roomId],
      });

      // Remove any pending UI request in admin's list
      const existingClients = getAllConnectedClients(roomId);
      if (existingClients.length > 0) {
        io.to(existingClients[0].socketId).emit(ACTIONS.REMOVE_JOIN_REQUEST, { requesterId });
      }
    } else {
      // deny
      io.to(requesterId).emit("join-denied");
      // Tell admin (and room) to remove the request UI item
      const existingClients = getAllConnectedClients(roomId);
      if (existingClients.length > 0) {
        io.to(existingClients[0].socketId).emit(ACTIONS.REMOVE_JOIN_REQUEST, { requesterId });
      }
    }
  });
  
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    if (roomId) {
      latestCode[roomId] = code;
    }
    // broadcast to others in room
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    if (socketId && code !== undefined) {
      io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
      // optionally update latestCode
      // If we want to update latestCode for room(s), we'd need to find the room — leaving for now
    }
  });

  socket.on("ADD_SUGGESTION", ({ roomId, suggestion, username }) => {
    socket.in(roomId).emit("NEW_SUGGESTION", { suggestion, username });
  });

  socket.on("ADD_TODO", ({ roomId, task, username, id }) => {
    socket.in(roomId).emit("NEW_TODO", { task, username, id });
  });

  socket.on("TOGGLE_TODO", ({ roomId, id }) => {
    socket.in(roomId).emit("TOGGLE_TODO", { id });
  });

  socket.on(ACTIONS.LANGUAGE_CHANGE, async ({ roomId, language }) => {
    roomLanguages[roomId] = language;
    socket.in(roomId).emit(ACTIONS.LANGUAGE_CHANGE, { language });

    // Persist language change to DB
    try {
      await Code.findOneAndUpdate(
        { roomId },
        { language },
        { upsert: false } // Don't create new document, only update existing
      ).exec();
      console.log(`SERVER: Updated language to ${language} for room ${roomId}`);
    } catch (dbErr) {
      console.error("SERVER: Failed to persist language change to DB:", dbErr);
    }
  });

  socket.on(ACTIONS.CURSOR_UPDATE, ({ roomId, cursorPos, username }) => {
    console.log("SERVER: Received CURSOR_UPDATE from", username, "in room", roomId, "at", cursorPos); // Debug log
    socket.in(roomId).emit(ACTIONS.CURSOR_UPDATE, { cursorPos, username });
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });

      // If the disconnecting user was admin and room becomes empty, don't delete admin from DB
      // This allows admin to rejoin later
      const remainingClients = getAllConnectedClients(roomId);
      if (remainingClients.length === 0) {
        console.log(`Room ${roomId} is now empty. Admin ${userSocketMap[socket.id]} can rejoin later.`);
      }
    });
    delete userSocketMap[socket.id];
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
