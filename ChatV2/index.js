const express = require('express');
const app = express();
const http = require("http");
const { Server } = require('socket.io');
const cors = require("cors");
const axios = require('axios');

// Production-ready CORS configuration
app.use(cors({
    origin: [
        'http://localhost:3000',              // Your local React
        'http://localhost:8000',              // Your local Django  
        /^https:\/\/.*\.railway\.app$/,       // Railway domains
        /^https:\/\/.*\.herokuapp\.com$/,     // Heroku domains
        /^https:\/\/.*\.vercel\.app$/,        // Vercel domains
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Local network IPs
        /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,  // Local network IPs
        /^http:\/\/172\.\d+\.\d+\.\d+:\d+$/, // Local network IPs
    ],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
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

// Configuration - supports both local and deployed Django
const DJANGO_API = process.env.DJANGO_API || 'http://localhost:8000';
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// In-memory storage (no Redis needed for development!)
const activeUsers = new Map();
const roomUsers = new Map();
const userSockets = new Map();

console.log(`🌍 Socket.IO Chat Server - Railway Edition`);
console.log(`📡 Django API: ${DJANGO_API}`);
console.log(`🌐 Environment: ${NODE_ENV}`);
console.log(`🔗 Port: ${PORT}`);

// Enhanced CORS headers for cross-origin requests
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});

// Utility function to verify user with Django
async function verifyUserWithDjango(cookies, djangoUrl = DJANGO_API) {
    try {
        console.log('🔍 Attempting Django auth with:', djangoUrl);
        
        const response = await axios.get(`${djangoUrl}/user_info/`, {
            headers: {
                'Cookie': cookies,
                'User-Agent': 'Socket.IO-Railway-Server',
                'Accept': 'application/json',
            },
            withCredentials: true,
            timeout: 10000 // 10 second timeout
        });
        
        console.log('✅ Django auth successful:', response.data.username);
        return response.data;
    } catch (error) {
        console.error('❌ Auth verification failed:', {
            url: djangoUrl,
            status: error.response?.status,
            message: error.message,
            data: error.response?.data
        });
        return null;
    }
}

// Helper function to get room name from chat selection
function getRoomName(selectedChat) {
    if (selectedChat.group_id) {
        return `group_${selectedChat.group_id}`;
    } else {
        // For individual chats, create consistent room name
        const ids = [
            selectedChat.sender_id || selectedChat.id, 
            selectedChat.receiver_id || selectedChat.id
        ].filter(id => id).sort((a, b) => a - b);
        return `chat_${ids[0]}_${ids[1]}`;
    }
}

io.on("connection", (socket) => {
    console.log('🔌 User connected:', socket.id);

    // Handle user authentication
    socket.on('authenticate', async (data) => {
        console.log('🔐 Authentication attempt for socket:', socket.id);
        console.log('📋 Auth data received:', {
            hasCookies: !!data.cookies,
            hasUser: !!data.user,
            method: data.method || 'cookie',
            djangoUrl: data.djangoUrl || 'default',
            userPreview: data.user ? `${data.user.username} (ID: ${data.user.id})` : 'none'
        });
        
        const { cookies, user, method, djangoUrl } = data;
        
        // Method 1: Direct authentication (bypass Django check)
        if (method === 'direct' && user && user.id && user.username) {
            console.log('🎯 Using direct authentication method');
            
            socket.userId = user.id;
            socket.username = user.username;
            socket.cookies = cookies;
            socket.djangoUrl = djangoUrl || DJANGO_API;
            
            activeUsers.set(socket.id, {
                id: user.id,
                username: user.username,
                socketId: socket.id
            });
            
            userSockets.set(user.id, socket.id);
            
            socket.emit('authenticated', { 
                success: true, 
                user: user,
                method: 'direct',
                server: 'railway'
            });
            
            console.log(`✅ User authenticated directly: ${user.username} (ID: ${user.id})`);
            return;
        }
        
        // Method 2: Django cookie authentication (fallback)
        if (cookies) {
            console.log('🍪 Attempting Django cookie authentication...');
            const djangoUser = await verifyUserWithDjango(cookies, djangoUrl);
            
            if (djangoUser) {
                socket.userId = djangoUser.id;
                socket.username = djangoUser.username;
                socket.cookies = cookies;
                socket.djangoUrl = djangoUrl || DJANGO_API;
                
                activeUsers.set(socket.id, {
                    id: djangoUser.id,
                    username: djangoUser.username,
                    socketId: socket.id
                });
                
                userSockets.set(djangoUser.id, socket.id);
                
                socket.emit('authenticated', { 
                    success: true, 
                    user: djangoUser,
                    method: 'django',
                    server: 'railway'
                });
                
                console.log(`✅ User authenticated via Django: ${djangoUser.username} (ID: ${djangoUser.id})`);
                return;
            }
        }
        
        // Authentication failed
        socket.emit('authenticated', { 
            success: false, 
            error: 'No valid authentication method available',
            server: 'railway'
        });
        console.log('❌ Authentication failed for socket:', socket.id);
    });

    // Handle joining a chat room
    socket.on('join_chat', (data) => {
        const { selectedChat } = data;
        
        if (!socket.userId || !selectedChat) {
            socket.emit('error', { message: 'Authentication required or invalid chat' });
            return;
        }

        const roomName = getRoomName(selectedChat);
        
        // Leave previous room if any
        if (socket.currentRoom) {
            socket.leave(socket.currentRoom);
            if (roomUsers.has(socket.currentRoom)) {
                roomUsers.get(socket.currentRoom).delete(socket.userId);
            }
        }

        // Join new room
        socket.join(roomName);
        socket.currentRoom = roomName;
        socket.selectedChat = selectedChat;

        // Track users in room
        if (!roomUsers.has(roomName)) {
            roomUsers.set(roomName, new Set());
        }
        roomUsers.get(roomName).add(socket.userId);

        // Notify room about new user (only for groups to avoid spam)
        if (selectedChat.group_id) {
            socket.to(roomName).emit('user_joined', {
                username: socket.username,
                message: `${socket.username} joined the chat`,
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
        }

        // Send current room users
        socket.emit('room_users', {
            users: Array.from(roomUsers.get(roomName))
        });

        console.log(`👋 ${socket.username} joined room: ${roomName}`);
    });

    // Handle real-time message broadcasting (NO Django saving - frontend handles that)
    socket.on('broadcast_message', (data) => {
        const { selectedChat, message, messageData } = data;
        
        if (!socket.userId || !socket.selectedChat || !message.trim()) {
            socket.emit('error', { message: 'Invalid message data' });
            return;
        }

        const roomName = socket.currentRoom;
        
        // Create real-time message object for broadcasting
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

        // Broadcast to ALL users in room (including sender for confirmation)
        io.to(roomName).emit('new_message', broadcastMessage);
        console.log(`💬 Broadcasting message from ${socket.username} in ${roomName}: ${message.substring(0, 50)}...`);
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
        if (socket.currentRoom && socket.username) {
            socket.to(socket.currentRoom).emit('user_typing', {
                userId: socket.userId,
                username: socket.username,
                isTyping: true
            });
        }
    });

    socket.on('typing_stop', (data) => {
        if (socket.currentRoom && socket.username) {
            socket.to(socket.currentRoom).emit('user_typing', {
                userId: socket.userId,
                username: socket.username,
                isTyping: false
            });
        }
    });

    // Handle disconnection
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
                
                // Notify room about user leaving (only for groups)
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

// Health check endpoint with detailed info
app.get('/health', (req, res) => {
    res.json({ 
        status: 'Socket.IO Railway Chat Server Running',
        version: '1.0.0',
        activeUsers: activeUsers.size,
        activeRooms: roomUsers.size,
        timestamp: new Date().toISOString(),
        djangoApi: DJANGO_API,
        environment: NODE_ENV,
        port: PORT
    });
});

// Test connection to Django
app.get('/test-django', async (req, res) => {
    try {
        const response = await axios.get(`${DJANGO_API}/user_info/`, {
            headers: {
                'Cookie': req.headers.cookie || '',
                'User-Agent': 'Socket.IO-Railway-Server-Test'
            },
            timeout: 5000
        });
        res.json({ 
            success: true, 
            django_response: response.data,
            django_url: DJANGO_API,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            django_url: DJANGO_API,
            status: error.response?.status,
            timestamp: new Date().toISOString()
        });
    }
});

// Basic info endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'MovieNight Chat Server',
        status: 'Running on Railway',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            testDjango: '/test-django'
        },
        websocket: 'Socket.IO enabled',
        timestamp: new Date().toISOString()
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 RAILWAY CHAT SERVER RUNNING ON PORT ${PORT}`);
    console.log(`🌍 Accessible from anywhere!`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Django API: ${DJANGO_API}`);
    console.log(`⚡ Ready for global connections!`);
    
    if (NODE_ENV === 'production') {
        console.log(`🌐 Production mode - Railway deployment active!`);
    } else {
        console.log(`🛠️ Development mode - Railway deployment for testing`);
    }
});