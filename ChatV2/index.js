const express = require('express');
const app = express();
const http = require("http");
const { Server } = require('socket.io');
const cors = require("cors");
const axios = require('axios');

// Production-ready CORS configuration
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:8000',
        /^https:\/\/.*\.railway\.app$/,
        /^https:\/\/.*\.herokuapp\.com$/,
        /^https:\/\/.*\.vercel\.app$/,
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
        /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
        /^http:\/\/172\.\d+\.\d+\.\d+:\d+$/,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
    transports: ['websocket'],
    cors: {
        origin: [
            'http://localhost:3000',
            'http://localhost:8000',
            /^https:\/\/.*\.railway\.app$/,
            /^https:\/\/.*\.herokuapp\.com$/,
            /^https:\/\/.*\.vercel\.app$/,
            /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
            /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
            /^http:\/\/172\.\d+\.\d+\.\d+:\d+$/,
        ],
        methods: ["GET", "POST", "OPTIONS"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization", "Cookie"]
    }
});

// Socket.IO connection error logging
io.engine.on("connection_error", (err) => {
    console.error("\u274C Socket.IO connection error:", err);
});

// In-memory storage
const activeUsers = new Map();
const roomUsers = new Map();
const userSockets = new Map();

// Helper to get room name
function getRoomName(selectedChat) {
    if (selectedChat.group_id) {
        return `group_${selectedChat.group_id}`;
    } else {
        const ids = [
            selectedChat.sender_id || selectedChat.id,
            selectedChat.receiver_id || selectedChat.id
        ].filter(Boolean).sort((a, b) => a - b);
        return `chat_${ids[0]}_${ids[1]}`;
    }
}

io.on("connection", (socket) => {
    console.log('🔌 User connected:', socket.id);

    socket.on('authenticate', async (data) => {
        const { cookies, user, method, djangoUrl } = data;

        if (method === 'direct' && user?.id && user?.username) {
            socket.userId = user.id;
            socket.username = user.username;
            socket.cookies = cookies;
            socket.djangoUrl = djangoUrl;

            activeUsers.set(socket.id, {
                id: user.id,
                username: user.username,
                socketId: socket.id
            });

            userSockets.set(user.id, socket.id);
            socket.emit('authenticated', { success: true, user });
            return;
        }

        if (cookies) {
            try {
                const res = await axios.get(`${djangoUrl}/user_info/`, {
                    headers: {
                        'Cookie': cookies,
                        'User-Agent': 'Socket.IO-Server'
                    },
                    withCredentials: true
                });
                socket.userId = res.data.id;
                socket.username = res.data.username;
                socket.cookies = cookies;
                socket.djangoUrl = djangoUrl;

                activeUsers.set(socket.id, {
                    id: res.data.id,
                    username: res.data.username,
                    socketId: socket.id
                });

                userSockets.set(res.data.id, socket.id);
                socket.emit('authenticated', { success: true, user: res.data });
            } catch {
                socket.emit('authenticated', { success: false });
            }
        }
    });

    socket.on('join_chat', ({ selectedChat }) => {
        if (!socket.userId || !selectedChat) return;

        const roomName = getRoomName(selectedChat);

        if (socket.currentRoom) {
            socket.leave(socket.currentRoom);
            if (roomUsers.has(socket.currentRoom)) {
                roomUsers.get(socket.currentRoom).delete(socket.userId);
            }
        }

        socket.join(roomName);
        socket.currentRoom = roomName;
        socket.selectedChat = selectedChat;

        if (!roomUsers.has(roomName)) {
            roomUsers.set(roomName, new Set());
        }
        roomUsers.get(roomName).add(socket.userId);

        if (selectedChat.group_id) {
            socket.to(roomName).emit('user_joined', {
                username: socket.username,
                message: `${socket.username} joined the chat`,
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
        }

        socket.emit('room_users', {
            users: Array.from(roomUsers.get(roomName))
        });
    });

    socket.on('broadcast_message', ({ selectedChat, message, messageData }) => {
        const roomName = getRoomName(selectedChat);
        if (!socket.userId || !roomName || !message.trim()) return;

        const broadcastMessage = {
            id: messageData?.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sender_id: socket.userId,
            user_sending: socket.username,
            message_content: message.trim(),
            timestamp: new Date().toISOString(),
            room: roomName,
            group_id: selectedChat.group_id,
            status: 'Sent'
        };

        io.to(roomName).emit('new_message', broadcastMessage);
        console.log(`💬 Message from ${socket.username} in ${roomName}: ${message.substring(0, 50)}...`);
    });

    socket.on('typing_start', () => {
        if (socket.currentRoom) {
            socket.to(socket.currentRoom).emit('user_typing', {
                userId: socket.userId,
                username: socket.username,
                isTyping: true
            });
        }
    });

    socket.on('typing_stop', () => {
        if (socket.currentRoom) {
            socket.to(socket.currentRoom).emit('user_typing', {
                userId: socket.userId,
                username: socket.username,
                isTyping: false
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.id}`);

        const userData = activeUsers.get(socket.id);
        activeUsers.delete(socket.id);

        if (userData) {
            userSockets.delete(userData.id);
        }

        if (socket.currentRoom && userData) {
            const roomUserSet = roomUsers.get(socket.currentRoom);
            if (roomUserSet) {
                roomUserSet.delete(userData.id);

                if (socket.selectedChat && socket.selectedChat.group_id) {
                    socket.to(socket.currentRoom).emit('user_left', {
                        username: socket.username,
                        message: `${socket.username} left the chat`,
                        timestamp: new Date().toISOString(),
                        isSystemMessage: true
                    });
                }
            }
        }
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'Socket.IO Railway Chat Server Running',
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 3001
    });
});

server.listen(process.env.PORT || 3001, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${process.env.PORT || 3001}`);
});
