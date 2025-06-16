const express = require('express');
const app = express();
const http = require("http");
const { Server } = require('socket.io');
const cors = require("cors");
const axios = require('axios');

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization", "Cookie"]
    }
});

// In-memory storage (no Redis needed for development!)
const activeUsers = new Map();
const roomUsers = new Map();
const userSockets = new Map(); // Map user IDs to socket IDs

// Django API configuration
const DJANGO_API = 'http://localhost:8000';

// Utility function to verify user with Django
async function verifyUserWithDjango(cookies) {
    try {
        console.log('🔍 Attempting Django auth with cookies:', cookies ? 'present' : 'missing');
        
        const response = await axios.get(`${DJANGO_API}/user_info/`, {
            headers: {
                'Cookie': cookies,
                'User-Agent': 'Socket.IO-Server',
                'Accept': 'application/json',
            },
            withCredentials: true
        });
        
        console.log('✅ Django auth successful:', response.data.username);
        return response.data;
    } catch (error) {
        console.error('❌ Auth verification failed:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });
        return null;
    }
}

// Utility function to save message to Django
async function saveMessageToDjango(messageData, cookies) {
    try {
        const response = await axios.post(`${DJANGO_API}/send_message/`, messageData, {
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies,
                'X-CSRFToken': extractCSRFToken(cookies)
            }
        });
        return response.data;
    } catch (error) {
        console.error('Failed to save message to Django:', error.message);
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        return null;
    }
}

// Helper function to extract CSRF token from cookies
function extractCSRFToken(cookies) {
    if (!cookies) return '';
    const match = cookies.match(/csrftoken=([^;]+)/);
    return match ? match[1] : '';
}

// Helper function to get room name from chat selection
function getRoomName(selectedChat) {
    if (selectedChat.group_id) {
        return `group_${selectedChat.group_id}`;
    } else {
        // For individual chats, create a consistent room name using sorted user IDs
        return `chat_${Math.min(selectedChat.sender_id, selectedChat.receiver_id)}_${Math.max(selectedChat.sender_id, selectedChat.receiver_id)}`;
    }
}

io.on("connection", (socket) => {
    console.log('🔌 User connected: ' + socket.id);

    // Handle user authentication using Django session cookies
    socket.on('authenticate', async (data) => {
        console.log('🔐 Authentication attempt for socket:', socket.id);
        console.log('📋 Auth data received:', {
            hasCookies: !!data.cookies,
            cookieLength: data.cookies?.length || 0,
            hasUser: !!data.user,
            method: data.method || 'cookie',
            cookiePreview: data.cookies?.substring(0, 100) + '...' || 'none'
        });
        
        const { cookies, user, method } = data;
        
        // Method 1: Direct authentication (bypass Django check)
        if (method === 'direct' && user) {
            console.log('🎯 Using direct authentication method');
            
            socket.userId = user.id;
            socket.username = user.username;
            socket.cookies = cookies; // Keep cookies for message saving
            
            // Store user mapping
            activeUsers.set(socket.id, {
                id: user.id,
                username: user.username,
                socketId: socket.id
            });
            
            userSockets.set(user.id, socket.id);
            
            socket.emit('authenticated', { 
                success: true, 
                user: user,
                method: 'direct'
            });
            
            console.log(`✅ User authenticated directly: ${user.username} (ID: ${user.id})`);
            return;
        }
        
        // Method 2: Django cookie authentication (fallback)
        if (!cookies) {
            console.log('❌ No cookies provided and no direct auth');
            socket.emit('authenticated', { success: false, error: 'No authentication method available' });
            return;
        }
        
        console.log('🍪 Attempting Django cookie authentication...');
        const djangoUser = await verifyUserWithDjango(cookies);
        
        if (djangoUser) {
            socket.userId = djangoUser.id;
            socket.username = djangoUser.username;
            socket.cookies = cookies;
            
            // Store user mapping
            activeUsers.set(socket.id, {
                id: djangoUser.id,
                username: djangoUser.username,
                socketId: socket.id
            });
            
            userSockets.set(djangoUser.id, socket.id);
            
            socket.emit('authenticated', { 
                success: true, 
                user: djangoUser,
                method: 'django' 
            });
            
            console.log(`✅ User authenticated via Django: ${djangoUser.username} (ID: ${djangoUser.id})`);
        } else {
            socket.emit('authenticated', { 
                success: false, 
                error: 'Django authentication failed - ID token missing from session' 
            });
            console.log('❌ Django authentication failed for socket:', socket.id);
        }
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
            
            // Remove from previous room users
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

        // Notify room about new user (except for individual chats to avoid spam)
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

    // Handle sending messages
    socket.on('send_message', async (data) => {
        const { selectedChat, message } = data;
        
        if (!socket.userId || !socket.selectedChat || !message.trim()) {
            socket.emit('error', { message: 'Invalid message data' });
            return;
        }

        const roomName = socket.currentRoom;
        
        // Create real-time message object first
        const realtimeMessage = {
            id: Date.now(), // Temporary ID for real-time
            sender_id: socket.userId,
            user_sending: socket.username,
            message_content: message.trim(),
            timestamp: new Date().toISOString(),
            room: roomName
        };

        // Broadcast to all users in the room immediately
        io.to(roomName).emit('new_message', realtimeMessage);
        console.log(`💬 ${socket.username} in ${roomName}: ${message}`);

        // Try to save to Django backend (but don't fail if it doesn't work)
        if (socket.cookies) {
            const messageData = selectedChat.group_id ? {
                user_sending: socket.userId,
                user_recieving: selectedChat.group_id,
                message: message.trim()
            } : {
                sender_id: socket.userId,
                receiver_id: selectedChat.id,
                message: message.trim()
            };

            const savedMessage = await saveMessageToDjango(messageData, socket.cookies);
            
            if (savedMessage) {
                console.log('✅ Message saved to Django successfully');
            } else {
                console.log('⚠️ Message not saved to Django, but real-time delivery successful');
                // Could implement a retry mechanism or local storage here
            }
        } else {
            console.log('⚠️ No cookies available, message not saved to Django backend');
        }
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
        
        // Clean up user data
        const userData = activeUsers.get(socket.id);
        activeUsers.delete(socket.id);
        
        if (userData) {
            userSockets.delete(userData.id);
        }
        
        // Remove from room users
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

    // Handle getting chat history
    socket.on('get_chat_history', async (data) => {
        const { selectedChat } = data;
        
        if (!socket.userId || !selectedChat) {
            console.log('⚠️ No user ID or selected chat for history request');
            socket.emit('chat_history', { messages: [] });
            return;
        }

        try {
            const endpoint = selectedChat.group_id
                ? `group_messages/?group_id=${selectedChat.group_id}`
                : `group_messages/?group_id=${selectedChat.id}`;

            console.log(`📚 Fetching chat history from: ${DJANGO_API}/${endpoint}`);

            const response = await axios.get(`${DJANGO_API}/${endpoint}`, {
                headers: {
                    'Cookie': socket.cookies || '',
                    'X-CSRFToken': extractCSRFToken(socket.cookies || ''),
                    'User-Agent': 'Socket.IO-Server'
                }
            });

            console.log(`✅ Chat history loaded: ${response.data.messages?.length || 0} messages`);
            socket.emit('chat_history', {
                messages: response.data.messages || []
            });
        } catch (error) {
            console.error('⚠️ Error fetching chat history:', error.message);
            console.error('Status:', error.response?.status);
            console.error('Error data:', error.response?.data);
            
            // Send empty history but don't fail
            socket.emit('chat_history', { 
                messages: [], 
                error: 'Could not load chat history from Django' 
            });
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'Socket.IO Chat Server Running',
        activeUsers: activeUsers.size,
        activeRooms: roomUsers.size,
        timestamp: new Date().toISOString()
    });
});

// Test Django connectivity endpoint
app.get('/test-django', async (req, res) => {
    try {
        const response = await axios.get(`${DJANGO_API}/user_info/`, {
            headers: {
                'Cookie': req.headers.cookie || '',
                'User-Agent': 'Socket.IO-Server-Test',
                'Accept': 'application/json',
            },
            withCredentials: true
        });
        res.json({ 
            success: true, 
            django_response: response.data,
            cookies_received: !!req.headers.cookie
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            status: error.response?.status,
            django_error: error.response?.data,
            cookies_received: !!req.headers.cookie
        });
    }
});

server.listen(3001, () => {
    console.log("🚀 ENHANCED CHAT SERVER IS RUNNING ON PORT 3001");
    console.log("🎉 No Redis required for development!");
    console.log("📍 Health check: http://localhost:3001/health");
});