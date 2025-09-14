import express from "express";
socket.on("setVideo", ({ roomId, videoId }) => {
const state = roomStates[roomId];
if (!state) return;
if (state.controllerId && state.controllerId !== socket.id) return; // only controller


state.videoId = videoId;
state.isPlaying = false;
state.time = 0;
state.updatedAt = Date.now();
io.to(roomId).emit("setVideo", { videoId });
});


// Playback control events (play/pause/seek)
socket.on("control", ({ roomId, action, time }) => {
const state = roomStates[roomId];
if (!state) return;
if (state.controllerId && state.controllerId !== socket.id) return; // only controller


// Update state
if (action === "play") state.isPlaying = true;
if (action === "pause") state.isPlaying = false;
if (action === "seek") {
// no change to isPlaying
}
state.time = Number(time) || 0;
state.updatedAt = Date.now();


// Relay to room
io.to(roomId).emit("control", {
action,
time: state.time,
serverTime: state.updatedAt
});
});


// Transfer controller
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


// Leave cleanup (soft)
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
console.log(`Watch Party server running on http://localhost:${PORT}`);
});
