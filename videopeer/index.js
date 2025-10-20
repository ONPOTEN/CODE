const { Server } = require('socket.io');
const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

// Configuration
const PORT = process.env.PORT || 3000;
const HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

console.log(`\n[${'═'.repeat(50)}]`);
console.log('VideoPeer Socket.IO HTTPS Server Configuration');
console.log(`[${'═'.repeat(50)}]\n`);
console.log(`Hostname: ${HOSTNAME}`);
console.log(`Port: ${PORT}`);

// Load SSL certificate files - Try local PFX first, then fallback
const pfxPath = path.join(__dirname, 'server.pfx');
const pfxPathFallback = path.join(__dirname, '..', 'laravel-api', 'server.pfx');

let finalPfxPath = pfxPath;
if (!fs.existsSync(pfxPath)) {
  if (fs.existsSync(pfxPathFallback)) {
    finalPfxPath = pfxPathFallback;
    console.log(`PFX Path: ${pfxPathFallback} (using fallback)`);
  } else {
    console.log(`PFX Path: ${pfxPath} ✗ Not found`);
    console.error(`\n✗ ERROR: PFX certificate not found at:\n  - ${pfxPath}\n  - ${pfxPathFallback}`);
    console.error(`\nPlease ensure the certificate exists. Generate it using:\n`);
    console.error(`  cd laravel-api`);
    console.error(`  openssl pkcs12 -export -out server.pfx -inkey server.key -in server.crt -password pass:""\n`);
    process.exit(1);
  }
} else {
  console.log(`PFX Path: ${pfxPath} ✓ Found`);
}

console.log();

// Read SSL certificate files - PFX format (no passphrase)
const serverOptions = {
  pfx: fs.readFileSync(finalPfxPath),
  passphrase: 'MatKhauBaoMat123' // Empty passphrase - no password on our cert
};

// Create HTTPS server
const server = https.createServer(serverOptions, app);

// Configure CORS for Socket.IO
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: false
    }
});

// Configure CORS for Express
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST']
}));

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello World");
});

// Chat message emission endpoint - receives from Laravel and broadcasts via Socket.IO
app.post("/api/emit-message", (req, res) => {
    const { senderId, recipientId, messageData, senderRoomName, recipientRoomName } = req.body;

    if (!recipientId || !messageData) {
        console.error('Invalid emit-message request:', req.body);
        return res.status(400).json({ error: 'Missing recipientId or messageData' });
    }

    console.log(`\n💬 [CHAT MESSAGE] Received from Laravel`);
    console.log(`   Sender ID: ${senderId}`);
    console.log(`   Recipient ID: ${recipientId}`);
    console.log(`   Message: ${messageData.message}`);
    console.log(`   Sender Room: ${senderRoomName}`);
    console.log(`   Recipient Room: ${recipientRoomName}`);

    // Add room names to message data
    const enrichedMessage = {
        ...messageData,
        host_room: senderRoomName,
        remote_room: recipientRoomName
    };

    // Check who's in the room before emitting
    const roomMembers = io.sockets.adapter.rooms.get(senderRoomName);
    console.log(`📊 Room ${senderRoomName} has ${roomMembers ? roomMembers.size : 0} members:`, roomMembers ? Array.from(roomMembers) : []);

    // Emit to the shared room (since room names are sorted, both users are in same room)
    if (senderRoomName === recipientRoomName) {
        io.to(senderRoomName).emit('new:message', enrichedMessage);
        console.log(`✅ Message emitted to room: ${senderRoomName} (${roomMembers ? roomMembers.size : 0} users in room)`);
    } else {
        // Emit to both rooms just in case
        io.to(recipientRoomName).emit('new:message', enrichedMessage);
        console.log(`✅ Message emitted to room: ${recipientRoomName}`);

        io.to(senderRoomName).emit('new:message', enrichedMessage);
        console.log(`✅ Message emitted to room: ${senderRoomName}`);
    }

    // Log all registered users
    console.log(`📋 Registered users:`, Array.from(userIdToSocket.entries()));

    // Also emit directly to recipient's socket if connected
    const recipientSocketId = userIdToSocket.get(recipientId.toString());
    if (recipientSocketId) {
        io.to(recipientSocketId).emit('new:message', enrichedMessage);
        console.log(`✅ Direct message to recipient socket: ${recipientSocketId}`);

        // Verify socket exists
        const recipientSocket = io.sockets.sockets.get(recipientSocketId);
        console.log(`   Recipient socket connected: ${recipientSocket ? 'YES' : 'NO'}`);
    } else {
        console.log(`⚠️  Recipient ${recipientId} not found in userIdToSocket map`);
    }

    // Also emit directly to sender's socket if connected
    const senderSocketId = userIdToSocket.get(senderId ? senderId.toString() : null);
    if (senderSocketId) {
        io.to(senderSocketId).emit('new:message', enrichedMessage);
        console.log(`✅ Direct message to sender socket: ${senderSocketId}`);

        // Verify socket exists
        const senderSocket = io.sockets.sockets.get(senderSocketId);
        console.log(`   Sender socket connected: ${senderSocket ? 'YES' : 'NO'}`);
    } else {
        console.log(`⚠️  Sender ${senderId} not found in userIdToSocket map`);
    }

    // FALLBACK: Emit to ALL connected sockets (let frontend filter by conversation_id)
    io.emit('new:message', enrichedMessage);
    console.log(`📢 BROADCAST: Message emitted to ALL connected sockets`);

    res.status(200).json({ success: true, message: 'Message emitted' });
});

const emailToSocket = new Map();
const socketToEmail = new Map();
const userIdToSocket = new Map();  // NEW: Map user IDs to socket IDs
const socketToUserId = new Map();  // NEW: Map socket IDs to user IDs

io.on("connection", (socket) => {
    console.log(`Socket Connected: ${socket.id}`);

    // Register user when they connect
    socket.on("chat:register", ({ userId }) => {
        if (userId) {
            userIdToSocket.set(userId.toString(), socket.id);
            socketToUserId.set(socket.id, userId.toString());
            console.log(`✅ User ID ${userId} registered as socket ${socket.id}`);
        }
    });

    socket.on("room:join", data => {
        const { email, room, userId } = data;  // Accept userId parameter
        console.log(`User ${email} (ID: ${userId}) joining room ${room}`);

        emailToSocket.set(email, socket.id);
        socketToEmail.set(socket.id, email);

        // NEW: Map user ID to socket ID for room notifications
        if (userId) {
            userIdToSocket.set(userId.toString(), socket.id);
            socketToUserId.set(socket.id, userId.toString());
            console.log(`Mapped user ID ${userId} to socket ${socket.id}`);
        }
        
        // Get all clients in the room BEFORE this user joins
        const clientsInRoom = Array.from(io.sockets.adapter.rooms.get(room) || []);
        console.log(`Clients already in room: ${clientsInRoom.length}`);
        
        // Join the room
        socket.join(room);
        
        // If there are existing users in the room
        if (clientsInRoom.length > 0) {
            const existingUserId = clientsInRoom[0];
            const existingUserEmail = socketToEmail.get(existingUserId) || "Remote User";
            
            console.log(`Notifying new user ${socket.id} about existing user ${existingUserId}`);
            // Tell the NEW user about the EXISTING user
            io.to(socket.id).emit("user:joined", { 
                email: existingUserEmail, 
                id: existingUserId 
            });
            
            console.log(`Notifying existing user ${existingUserId} about new user ${socket.id}`);
            // Tell the EXISTING user about the NEW user
            io.to(existingUserId).emit("user:joined", { 
                email: email, 
                id: socket.id 
            });
        }
        
        // Confirm room join to the user who just joined
        io.to(socket.id).emit("room:join", data);
    });

    // PRE-CALL: Send room ID to remote BEFORE video call invite
    // This ensures remote knows which room to join
    socket.on("call:prep", ({ to, roomId, fromEmail }) => {
        const senderEmail = socketToEmail.get(socket.id) || fromEmail || "Host";
        console.log(`\n🏠 [PRE-CALL] Preparing call - Sending room ID to remote`);
        console.log(`   From: ${socket.id} (${senderEmail})`);
        console.log(`   To (user ID): ${to}`);
        console.log(`   Room ID: ${roomId}`);

        // NEW: Look up socket ID from user ID
        const targetSocketId = userIdToSocket.get(to);
        if (targetSocketId) {
            console.log(`   Resolved to socket ID: ${targetSocketId}`);
            io.to(targetSocketId).emit("call:prep", {
                from: socket.id,
                fromEmail: senderEmail,
                roomId: roomId,
                timestamp: new Date().toISOString()
            });
            console.log(`✅ [PRE-CALL] Room ID notification sent to ${to} (${targetSocketId})`);
        } else {
            console.log(`⚠️  [PRE-CALL] User ID ${to} not found in userIdToSocket map`);
            console.log(`   Available users: ${Array.from(userIdToSocket.keys()).join(', ')}`);
        }
    });

    // STEP 1: Room join invite - Host invites remote to join same room
    socket.on("room:invite", ({ to, roomId, roomName }) => {
        const fromEmail = socketToEmail.get(socket.id) || "Host";
        console.log(`\n🔑 [STEP 1] Room join invite from ${socket.id} (${fromEmail}) to ${to}`);
        console.log(`   Room ID: ${roomId}`);
        console.log(`   Room Name: ${roomName}`);

        io.to(to).emit("room:invite", {
            from: socket.id,
            fromEmail: fromEmail,
            roomId: roomId,
            roomName: roomName,
            timestamp: new Date().toISOString()
        });

        console.log(`✅ [STEP 1] Room invite sent to ${to}`);
    });

    // STEP 2: Video call invite - Host invites remote to video call
    socket.on("user:call", ({ to, offer }) => {
        const fromEmail = socketToEmail.get(socket.id) || "Host";
        console.log(`\n📞 [STEP 2] Video call invite from ${socket.id} (${fromEmail}) to ${to}`);
        console.log(`   SDP Offer length: ${offer.sdp.length}`);

        io.to(to).emit("incoming:call", {
            from: socket.id,
            fromEmail: fromEmail,
            offer,
            timestamp: new Date().toISOString()
        });

        console.log(`✅ [STEP 2] Video call invite sent to ${to}`);
    });

    socket.on("call:accepted", ({ to, ans }) => {
        const fromEmail = socketToEmail.get(socket.id) || "Remote";
        console.log(`✅ Call accepted from ${socket.id} (${fromEmail}) to ${to}`);

        io.to(to).emit("call:accepted", {
            from: socket.id,
            fromEmail: fromEmail,
            ans,
            timestamp: new Date().toISOString()
        });
    });

    socket.on("peer:nego:needed", ({ to, offer }) => {
        io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
    });

    socket.on("peer:nego:done", ({ to, ans }) => {
        io.to(to).emit("peer:nego:final", { from: socket.id, ans });
    });

    socket.on("call:end", ({ to }) => {
        io.to(to).emit("call:end", { from: socket.id });
    });

    socket.on("call:initiated", ({ to }) => {
        io.to(to).emit("call:initiated", { from: socket.id });
    });

    // Chat room management
    socket.on("chat:join-room", ({ roomName }) => {
        console.log(`\n👤 [CHAT] User joining room: ${roomName}`);
        socket.join(roomName);
        console.log(`✅ User ${socket.id} joined room ${roomName}`);
    });

    socket.on("chat:leave-room", ({ roomName }) => {
        console.log(`\n👤 [CHAT] User leaving room: ${roomName}`);
        socket.leave(roomName);
        console.log(`✅ User ${socket.id} left room ${roomName}`);
    });

    // Chat events
    socket.on("chat:message", ({ to, message, timestamp }) => {
        io.to(to).emit("chat:message", {
            from: socket.id,
            message,
            timestamp
        });
    });

    socket.on("chat:typing", ({ to, isTyping }) => {
        io.to(to).emit("chat:typing", {
            from: socket.id,
            isTyping
        });
    });

    socket.on("disconnect", () => {
        console.log(`Socket Disconnected: ${socket.id}`);
        const email = socketToEmail.get(socket.id);
        if (email) {
            emailToSocket.delete(email);
            socketToEmail.delete(socket.id);
        }
        // NEW: Clean up user ID mapping
        const userId = socketToUserId.get(socket.id);
        if (userId) {
            userIdToSocket.delete(userId);
            socketToUserId.delete(socket.id);
            console.log(`Removed user ID ${userId} mapping`);
        }
    });
});

server.listen(PORT, HOSTNAME, () => {
    console.log(`\n[${'═'.repeat(50)}]`);
    console.log('✓ VideoPeer Socket.IO HTTPS Server Started Successfully');
    console.log(`[${'═'.repeat(50)}]\n`);
    console.log(`🔒 Secure URL: https://www.centimet2.com:${PORT}`);
    console.log(`🔒 Alt URL: https://localhost:${PORT}`);
    console.log(`📦 Certificate: server.pfx (self-signed for www.centimet2.com)`);
    console.log(`🔌 Socket.IO: Ready for WebRTC signaling`);
    console.log(`\n⚠️  Browser will show a security warning - this is normal for development.\n`);
    console.log(`Press Ctrl+C to stop the server\n`);
});

// Error handling
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`✗ ERROR: Port ${PORT} is already in use`);
    } else {
        console.error(`✗ Server error:`, err.message);
    }
    process.exit(1);
});