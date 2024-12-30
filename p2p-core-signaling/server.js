import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();
const rooms = {}

const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.NODE_ENV !== "production"
    ? "*"
    : process.env.FRONTEND_URL || "https://zombiefile.vercel.app";


app.use(express.json());

app.get("/api/status", (req, res) => {
    res.status(200).json({ status: "ok", message: "Server is running" });
});

const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: CORS_ORIGIN,
        methods: ["GET", "POST"],
    },
});

process.on("SIGINT", () => {
    console.log("[INFO] Shutting down server...");
    io.close(() => {
        console.log("[INFO] WebSocket server closed.");
        server.close(() => {
            console.log("[INFO] HTTP server closed.");
            process.exit(0);
        });
    });
});

io.on("connection", (socket) => {
    console.log(`[INFO] User connected: ${socket.id}`);

    // Room creation
    socket.on("create-room", (roomId, callback) => {
        if (!roomId || typeof roomId !== "string") {
            console.error(`[ERROR] Invalid roomId from ${socket.id}`);
            if (callback) callback({ status: "error", message: "Invalid roomId" });
            return;
        }
        if (!rooms[roomId]) {
            rooms[roomId] = new Set();
        }
        rooms[roomId].add(socket.id);
        socket.join(roomId);
        console.log(`[INFO] Room created: ${roomId} by ${socket.id}`);
        if (callback) callback({ status: "ok", roomId });
    });

    // Joining a room
    socket.on("join-room", (roomId, callback) => {
        if (!roomId || typeof roomId !== "string") {
            console.error(`[ERROR] Invalid roomId from ${socket.id}`);
            if (callback) callback({ status: "error", message: "Invalid roomId" });
            return;
        }
        const room = rooms[roomId];
        if (room) {
            room.add(socket.id);
            socket.join(roomId);
            const peerCount = room.size;
            socket.to(roomId).emit("peer-joined", { peerCount });
            console.log(`[INFO] User ${socket.id} joined room: ${roomId}`);
            if (callback) callback({ status: "ok", peerCount });
        } else {
            console.log(`[ERROR] Room ${roomId} does not exist.`);
            if (callback) callback({ status: "error", message: "Room does not exist" });
        }
    });

    // Handle WebRTC signaling: offer
    socket.on("offer", ({ roomId, offer }, callback) => {
        if (!roomId || !offer) {
            console.error(`[ERROR] Invalid offer data from ${socket.id}`);
            if (callback) callback({ status: "error", message: "Invalid offer data" });
            return;
        }
        try {
            socket.to(roomId).emit("offer", { offer });
            console.log(`[INFO] Offer sent to room: ${roomId}`);
            if (callback) callback({ status: "ok" });
        } catch (error) {
            console.error(`[ERROR] Error sending offer: ${error.message}`);
            if (callback) callback({ status: "error", message: error.message });
        }
    });

    // Handle WebRTC signaling: answer
    socket.on("answer", ({ roomId, answer }, callback) => {
        if (!roomId || !answer) {
            console.error(`[ERROR] Invalid answer data from ${socket.id}`);
            if (callback) callback({ status: "error", message: "Invalid answer data" });
            return;
        }
        try {
            socket.to(roomId).emit("answer", { answer });
            console.log(`[INFO] Answer sent to room: ${roomId}`);
            if (callback) callback({ status: "ok" });
        } catch (error) {
            console.error(`[ERROR] Error sending answer: ${error.message}`);
            if (callback) callback({ status: "error", message: error.message });
        }
    });

    // Handle ICE candidates
    socket.on("ice-candidate", ({ roomId, candidate }, callback) => {
        if (!roomId || !candidate) {
            console.error(`[ERROR] Invalid ICE candidate data from ${socket.id}`);
            if (callback) callback({ status: "error", message: "Invalid ICE candidate data" });
            return;
        }
        try {
            socket.to(roomId).emit("ice-candidate", { candidate });
            console.log(`[INFO] ICE candidate sent to room: ${roomId}`);
            if (callback) callback({ status: "ok" });
        } catch (error) {
            console.error(`[ERROR] Error sending ICE candidate: ${error.message}`);
            if (callback) callback({ status: "error", message: error.message });
        }
    });

    // Handle peer disconnection
    socket.on("disconnecting", () => {
        Array.from(socket.rooms).forEach((roomId) => {
            if (rooms[roomId]) {
                rooms[roomId].delete(socket.id);
                socket.to(roomId).emit("peer-left", { peerCount: rooms[roomId].size });
                console.log(`[INFO] User ${socket.id} is leaving room: ${roomId}`);
            }
        });
    });

    socket.on("disconnect", () => {
        console.log(`[INFO] User disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`[INFO] Server is running on port ${PORT}`);
});
