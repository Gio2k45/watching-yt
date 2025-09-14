// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Lưu trạng thái phòng trong bộ nhớ
// roomStates[roomId] = { videoId, isPlaying, time, controllerId, updatedAt }
const roomStates = Object.create(null);

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  // Join room
  socket.on("joinRoom", ({ roomId, asController }) => {
    socket.join(roomId);

    if (!roomStates[roomId]) {
      roomStates[roomId] = {
        videoId: null,
        isPlaying: false,
        time: 0,
        controllerId: null,
        updatedAt: Date.now()
      };
    }

    const state = roomStates[roomId];
    if (asController && state.controllerId !== socket.id) {
      state.controllerId = socket.id;
      io.to(roomId).emit("controllerChanged", { controllerId: socket.id });
    }

    socket.emit("roomState", { ...state });
    socket.to(roomId).emit("system", { message: `A user joined room ${roomId}.` });
  });

  // Set video
  socket.on("setVideo", ({ roomId, videoId }) => {
    const state = roomStates[roomId];
    if (!state) return;
    if (state.controllerId && state.controllerId !== socket.id) return;

    state.videoId = videoId;
    state.isPlaying = false;
    state.time = 0;
    state.updatedAt = Date.now();
    io.to(roomId).emit("setVideo", { videoId });
  });

  // Control actions
  socket.on("control", ({ roomId, action, time }) => {
    const state = roomStates[roomId];
    if (!state) return;
    if (state.controllerId && state.controllerId !== socket.id) return;

    if (action === "play") state.isPlaying = true;
    if (action === "pause") state.isPlaying = false;
    if (action === "seek") {
      // giữ nguyên isPlaying
    }
    state.time = Number(time) || 0;
    state.updatedAt = Date.now();

    io.to(roomId).emit("control", {
      action,
      time: state.time,
      serverTime: state.updatedAt
    });
  });

  // Request control
  socket.on("requestController", ({ roomId }) => {
    const state = roomStates[roomId];
    if (!state) return;
    state.controllerId = socket.id;
    state.updatedAt = Date.now();
    io.to(roomId).emit("controllerChanged", { controllerId: socket.id });
  });

  // Chat
  socket.on("chat", ({ roomId, text, name }) => {
    io.to(roomId).emit("chat", { name: name || "Guest", text, at: Date.now() });
  });

  // Cleanup khi disconnect
  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms].filter((r) => r !== socket.id);
    rooms.forEach((roomId) => {
      const state = roomStates[roomId];
      if (!state) return;
      if (state.controllerId === socket.id) {
        state.controllerId = null;
        io.to(roomId).emit("controllerChanged", { controllerId: null });
      }
      socket.to(roomId).emit("system", { message: `A user left room ${roomId}.` });
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Watch Party server running on http://localhost:${PORT}`);
});
