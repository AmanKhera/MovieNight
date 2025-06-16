const express = require('express');
const app = express();
const http = require("http");
const { Server } = require('socket.io');
const cors = require("cors");

// Production-ready CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://movienightchat-production.up.railway.app', // Add your React deployment URL
    /\.vercel\.app$/,
    /\.railway\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST']
}));

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://movienightchat-production.up.railway.app',
      /\.vercel\.app$/,
      /\.railway\.app$/
    ],
    credentials: true,
    methods: ["GET", "POST"]
  }
});

// Track active users and rooms
const activeUsers = new Map(); // socket.id -> user info
const roomUsers = new Map();   // group_id -> Set of user info

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log('🔌 User connected:', socket.id);

  // Authentication handler (simplified - no Django verification needed)
  socket.on('authenticate', async (data) => {
    console.log('🔐 Authentication attempt for socket:', socket.id);
    console.log('📋 Auth data received:', {
      hasCookies: data.hasCookies,
      hasUser: data.hasUser,
      method: data.method,
      username: data.username
    });

    try {
      let userInfo = null;

      // Use direct authentication (from React)
      if (data.hasUser && data.username && data.userId) {
        console.log('🎯 Using direct authentication method');
        userInfo = {
          id: data.userId,
          username: data.username,
          email: data.email,
          userId: data.userId // Keep both for compatibility
        };
        console.log('✅ User authenticated directly:', userInfo.username, '(ID:', userInfo.id + ')');
      }

      if (userInfo) {
        // Store user info for this socket
        activeUsers.set(socket.id, userInfo);
        
        // Send success response
        socket.emit('authenticated', { 
          success: true, 
          user: userInfo,
          serverType: 'railway'
        });
        
        console.log('🎉 Authentication successful for:', userInfo.username);
      } else {
        throw new Error('No authentication method succeeded');
      }

    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      socket.emit('authentication_failed', { 
        error: error.message,
        details: 'Could not verify user identity'
      });
    }
  });

  // Test event for debugging
  socket.on('test_event', (data) => {
    console.log('🧪 Test event received:', data);
    socket.emit('test_response', { message: 'Test event received successfully!' });
  });

  // Join room handler (using group_id instead of room_id)
  socket.on('join_room', async (data) => {
    const userInfo = activeUsers.get(socket.id);
    if (!userInfo) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const groupId = data.group_id;
    console.log('🏠 User', userInfo.username, 'joining group:', groupId);

    // Leave all other rooms first
    const currentRooms = Array.from(socket.rooms).filter(room => room !== socket.id);
    currentRooms.forEach(room => {
      socket.leave(room);
      console.log('👋 Left room:', room);
    });

    // Join the new room using group_id as room identifier
    const roomIdentifier = `group_${groupId}`;
    socket.join(roomIdentifier);
    
    // Update room users tracking
    if (!roomUsers.has(groupId)) {
      roomUsers.set(groupId, new Set());
    }
    roomUsers.get(groupId).add(userInfo);

    console.log('✅ Joined group:', groupId, 'with room identifier:', roomIdentifier);
    
    // Notify others in the room
    socket.to(roomIdentifier).emit('user_joined', {
      username: userInfo.username,
      group_id: groupId
    });

    // Send room info to user
    socket.emit('room_joined', {
      group_id: groupId,
      users_in_room: Array.from(roomUsers.get(groupId) || []).map(u => u.username)
    });
  });

  // New simplified message broadcasting (no Django saving)
  socket.on("broadcast_message", (data) => {
    const userInfo = activeUsers.get(socket.id);
    if (!userInfo) {
      console.error('❌ No user info found for socket:', socket.id);
      return;
    }

    console.log('📡 === BROADCASTING MESSAGE ===');
    console.log('   👤 From user:', userInfo.username);
    console.log('   📝 Message:', data.message_content);
    console.log('   🏠 Group ID:', data.group_id);
    console.log('   🔗 Socket ID:', socket.id);

    // Create message object for broadcasting to others
    const messageForBroadcast = {
      id: data.id || Date.now(),
      user_sending: data.user_sending,
      user_recieving: data.user_recieving,
      message_content: data.message_content,
      date_sent: data.date_sent,
      status: data.status || 'Sent',
      group_id: data.group_id,
      user_id: data.user_id,
      sender_id: data.sender_id,
      from_user: data.from_user // Important for filtering
    };

    // Broadcast to all users in the group room EXCEPT the sender
    const roomIdentifier = `group_${data.group_id}`;
    console.log('📡 Broadcasting to room (excluding sender):', roomIdentifier);
    
    // Use socket.to() instead of io.to() to exclude the sender
    socket.to(roomIdentifier).emit("new_message", messageForBroadcast);
    
    console.log('✅ === BROADCAST COMPLETE ===');
    console.log('   📊 Room:', roomIdentifier);
    console.log('   👥 Sent to all others in room');
    console.log('   🚫 Excluded sender:', userInfo.username);
  });

  // Typing indicators (adapted for group_id)
  socket.on('typing', (data) => {
    const userInfo = activeUsers.get(socket.id);
    if (!userInfo) return;

    console.log('⌨️ User typing:', userInfo.username, 'in group:', data.group_id);
    
    const roomIdentifier = `group_${data.group_id}`;
    socket.to(roomIdentifier).emit('user_typing', {
      username: userInfo.username,
      group_id: data.group_id
    });
  });

  socket.on('stop_typing', (data) => {
    const userInfo = activeUsers.get(socket.id);
    if (!userInfo) return;

    console.log('⌨️ User stopped typing:', userInfo.username);
    
    const roomIdentifier = `group_${data.group_id}`;
    socket.to(roomIdentifier).emit('user_stopped_typing', {
      username: userInfo.username,
      group_id: data.group_id
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const userInfo = activeUsers.get(socket.id);
    
    if (userInfo) {
      console.log('👋 User disconnected:', userInfo.username);
      
      // Remove from all groups
      roomUsers.forEach((users, groupId) => {
        if (users.has(userInfo)) {
          users.delete(userInfo);
          if (users.size === 0) {
            roomUsers.delete(groupId);
          }
        }
      });
      
      // Remove from active users
      activeUsers.delete(socket.id);
    } else {
      console.log('👋 Unknown user disconnected:', socket.id);
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'Socket.IO Broadcasting Server Running',
    activeUsers: activeUsers.size,
    activeGroups: roomUsers.size,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    description: 'Real-time message broadcasting only - Django calls made directly from frontend'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'MovieNight Chat Broadcasting Server',
    version: '3.0.0',
    architecture: 'Frontend → Django (direct) + Socket.IO (broadcast)',
    features: [
      'Real-time message broadcasting via Socket.IO',
      'Direct Django API calls from frontend',
      'Simplified server architecture',
      'Group-based chat rooms',
      'User authentication via React',
      'Typing indicators'
    ],
    endpoints: {
      health: '/health'
    },
    websocket_url: 'wss://movienightchat-production.up.railway.app'
  });
});

// Get port from environment variable (Railway provides this)
const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 BROADCASTING SERVER RUNNING ON PORT ${PORT}`);
  console.log(`🌍 Accessible from anywhere!`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 Architecture: Frontend → Django (direct) + Socket.IO (broadcast)`);
  console.log(`🔗 Railway URL: https://movienightchat-production.up.railway.app`);
  console.log(`🎯 Simplified: No Django calls from server - just real-time broadcasting!`);
});