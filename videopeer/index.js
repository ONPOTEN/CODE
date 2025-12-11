const { Server } = require('socket.io');
const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');
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

// Helper function to save shop message to database
async function saveShopMessageToDatabase(messageData) {
    try {
        const laravelApiUrl = process.env.LARAVEL_API_URL || 'https://centimet2:8000/api/v1';
        const apiToken = process.env.LARAVEL_API_TOKEN || '';

        const payload = {
            shop_id: messageData.shopId,
            sender_id: messageData.userId || messageData.senderId,
            shop_owner_id: messageData.shopOwnerId,
            message: messageData.message,
        };

        // Remove trailing slash from base URL if present
        const baseUrl = laravelApiUrl.endsWith('/') ? laravelApiUrl.slice(0, -1) : laravelApiUrl;
        const endpoint = `${baseUrl}/shops/${messageData.shopId}/messages`;

        console.log(`\n💾 [DATABASE] Saving shop message to database`);
        console.log(`   Endpoint: ${endpoint}`);
        console.log(`   Payload:`, payload);
        console.log(`   Token present: ${apiToken ? 'YES' : 'NO'}`);

        const response = await axios.post(
            endpoint,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...(apiToken && { 'Authorization': `Bearer ${apiToken}` })
                },
                timeout: 10000,  // Increase timeout to 10 seconds
                // Disable SSL certificate validation for development
                httpsAgent: new (require('https').Agent)({
                    rejectUnauthorized: false
                })
            }
        );

        console.log(`✅ [DATABASE] Message saved successfully`);
        console.log(`   Response ID:`, response.data?.data?.id);
        console.log(`   Full Response:`, response.data);
        return response.data;
    } catch (error) {
        console.error(`❌ [DATABASE] Error saving message:`, error.message);
        console.error(`   Error Code:`, error.code);
        console.error(`   Error Type:`, error.constructor.name);

        if (error.response) {
            console.error(`   HTTP Status:`, error.response.status);
            console.error(`   Response Data:`, error.response.data);
        } else if (error.request) {
            console.error(`   No response received - request was sent but no reply`);
            console.error(`   Request details:`, error.request.path);
        } else {
            console.error(`   Request setup error:`, error.message);
        }

        // Don't throw - message delivery should not fail if DB save fails
        // Frontend will handle fallback save
        return null;
    }
}

// Helper function to create shop message room in Laravel database
async function createShopMessageRoomInLaravel(roomData) {
    try {
        const laravelApiUrl = process.env.LARAVEL_API_URL || 'https://centimet2:8000/api/v1';
        const apiToken = process.env.LARAVEL_API_TOKEN || '';

        const payload = {
            customer_id: roomData.customerId || roomData.userId,
            shop_id: roomData.shopId,
            shop_owner_id: roomData.shopOwnerId,
            subject: roomData.subject || null,
        };

        // Remove trailing slash from base URL if present
        const baseUrl = laravelApiUrl.endsWith('/') ? laravelApiUrl.slice(0, -1) : laravelApiUrl;
        const endpoint = `${baseUrl}/rooms/shop-message`;

        console.log(`\n🏪 [ROOM] Creating shop message room in Laravel`);
        console.log(`   Endpoint: ${endpoint}`);
        console.log(`   Customer ID: ${payload.customer_id}`);
        console.log(`   Shop ID: ${payload.shop_id}`);
        console.log(`   Shop Owner ID: ${payload.shop_owner_id}`);

        const response = await axios.post(
            endpoint,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...(apiToken && { 'Authorization': `Bearer ${apiToken}` })
                },
                timeout: 10000,
                // Disable SSL certificate validation for development
                httpsAgent: new (require('https').Agent)({
                    rejectUnauthorized: false
                })
            }
        );

        const roomName = response.data?.room_name || `${payload.customer_id}-shop${payload.shop_id}`;
        console.log(`✅ [ROOM] Room created successfully in Laravel`);
        console.log(`   Room ID: ${response.data?.data?.id}`);
        console.log(`   Room Name: ${roomName}`);
        return response.data;
    } catch (error) {
        console.error(`❌ [ROOM] Error creating room in Laravel:`, error.message);
        console.error(`   Error Code:`, error.code);

        if (error.response) {
            console.error(`   HTTP Status:`, error.response.status);
            console.error(`   Response Data:`, error.response.data);
        } else if (error.request) {
            console.error(`   No response received - request was sent but no reply`);
        } else {
            console.error(`   Request setup error:`, error.message);
        }

        // Return null but continue - room joining can work without Laravel persistence
        // This ensures Socket.IO room functionality isn't blocked by backend issues
        return null;
    }
}

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

    // Shop message room management
    socket.on("join:shop:room", ({ userId, shopId, roomName }) => {
        console.log(`\n🏪 [SHOP] User ${userId} joining shop room: ${roomName}`);
        socket.join(roomName);
        console.log(`✅ User ${socket.id} (ID: ${userId}) joined room ${roomName}`);

        // Register the socket to this room for message delivery
        userIdToSocket.set(userId.toString(), socket.id);
        socketToUserId.set(socket.id, userId.toString());
        console.log(`📍 Mapped user ${userId} to socket ${socket.id} for room ${roomName}`);
    });

    socket.on("leave:shop:room", ({ userId, shopId, roomName }) => {
        console.log(`\n🏪 [SHOP] User ${userId} leaving shop room: ${roomName}`);
        socket.leave(roomName);
        console.log(`✅ User ${socket.id} (ID: ${userId}) left room ${roomName}`);
    });

    // Shop message handling
    socket.on("shop:message", async (data) => {
        let { shopId, shopName, userId, userName, message, roomName, timestamp, shopOwnerId } = data;

        console.log(`\n💬 [SHOP MESSAGE] Received from customer`);
        console.log(`   Shop ID: ${shopId}`);
        console.log(`   Shop Name: ${shopName}`);
        console.log(`   Customer ID: ${userId}`);
        console.log(`   Customer Name: ${userName}`);
        console.log(`   Message: ${message}`);
        console.log(`   Room Name (from client): ${roomName}`);
        console.log(`   Timestamp: ${timestamp}`);

        // Normalize room name to {customerId}-shop{shopId} format
        // If roomName is broadcast pattern (*-shop{shopId}), convert to customer-specific room
        if (roomName && roomName.startsWith('*-shop')) {
            roomName = `${userId}-shop${shopId}`;
            console.log(`   Room Name (normalized): ${roomName}`);
        } else if (!roomName || roomName === '') {
            // If no room name provided, use customer-specific room
            roomName = `${userId}-shop${shopId}`;
            console.log(`   Room Name (created): ${roomName}`);
        }

        // Create the message object with normalized room name
        const shopMessage = {
            shopId,
            shopName,
            userId,
            userName,
            message,
            roomName,  // Now uses {customerId}-shop{shopId}
            timestamp
        };

        // Create room in Laravel database asynchronously (don't wait for response)
        createShopMessageRoomInLaravel({
            customerId: userId,
            shopId,
            shopOwnerId,
            subject: `Chat with ${userName}`
        }).then(roomResult => {
            if (roomResult) {
                console.log(`✅ [SHOP MESSAGE] Room created in Laravel`);
            }
        }).catch(err => {
            console.error(`❌ [SHOP MESSAGE] Room creation failed:`, err.message);
        });

        // Save message to database asynchronously (don't wait for response)
        saveShopMessageToDatabase({
            shopId,
            userId,
            shopOwnerId,
            message,
            timestamp
        }).then(dbResult => {
            if (dbResult) {
                console.log(`✅ [SHOP MESSAGE] Database save completed`);
            }
        }).catch(err => {
            console.error(`❌ [SHOP MESSAGE] Database save failed:`, err.message);
        });

        // Emit to the specific shop room (e.g., "5-shop123" where 5 is owner ID)
        // The room format should be {owner_id}-shop{shopId}
        // We need to find the shop owner and emit to their room
        // For now, we'll emit with a wildcard pattern and let clients filter

        // Log all active rooms
        const allRooms = io.sockets.adapter.rooms;
        console.log(`📋 All active rooms:`);
        for (const [roomName, members] of allRooms) {
            if (!roomName.startsWith('/')) { // Skip socket.io internal rooms
                console.log(`   - ${roomName}: ${members.size} members`);
            }
        }

        // Emit to the broadcast room pattern for this shop
        io.to(`*-shop${shopId}`).emit('shop:message', shopMessage);
        console.log(`📢 Message emitted to broadcast room: *-shop${shopId}`);

        // Also try to emit to rooms that match the pattern {*}-shop{shopId}
        for (const [roomName, members] of allRooms) {
            if (roomName.endsWith(`-shop${shopId}`)) {
                console.log(`📍 Found matching room: ${roomName} with ${members.size} members`);
                io.to(roomName).emit('shop:message', shopMessage);
                console.log(`✅ Message emitted to room: ${roomName}`);
            }
        }

        // FALLBACK: Emit to ALL connected sockets (frontend can filter by shopId)
        io.emit('shop:message', shopMessage);
        console.log(`📢 BROADCAST: Message emitted to ALL connected sockets`);
    });

    // Shop chat room management
    socket.on("join:shop:chat", ({ userId, shopId, shopOwnerId, roomName, userName }) => {
        console.log(`\n💬 [SHOP CHAT] User ${userId} (${userName}) joining chat room: ${roomName}`);

        // Join the room
        socket.join(roomName);
        console.log(`✅ User ${socket.id} (ID: ${userId}) joined chat room ${roomName}`);

        // Log room members after joining (matching direct message format)
        const roomMembers = io.sockets.adapter.rooms.get(roomName);
        console.log(`📍 Chat room members: ${roomMembers?.size || 0}`);
        if (roomMembers && roomMembers.size > 0) {
            console.log(`   Member socket IDs: [${Array.from(roomMembers).map(id => `'${id}'`).join(', ')}]`);
        }

        // Emit acknowledgment back to the joining user
        socket.emit('shop:chat:joined', {
            roomName,
            userId,
            shopId,
            timestamp: new Date().toISOString()
        });

        // Notify other members that a user has joined
        socket.to(roomName).emit('user:joined:chat', {
            userId,
            userName,
            roomName,
            timestamp: new Date().toISOString()
        });

        // BROADCAST: Emit join notification to ALL connected sockets (matching direct message pattern)
        io.emit('user:joined:shop:chat', {
            userId,
            userName,
            roomName,
            shopId,
            timestamp: new Date().toISOString()
        });
        console.log(`💬 [SHOP CHAT] room: ${roomName}:📢 BROADCAST: Message emitted to ALL connected sockets`);
    });

    socket.on("leave:shop:chat", ({ userId, shopId, shopOwnerId, roomName }) => {
        console.log(`\n💬 [SHOP CHAT] User ${userId} leaving chat room: ${roomName}`);
        socket.leave(roomName);
        console.log(`✅ User ${socket.id} (ID: ${userId}) left chat room ${roomName}`);

        // Log room members after leaving (matching direct message format)
        const roomMembersAfter = io.sockets.adapter.rooms.get(roomName);
        console.log(`📍 Chat room members after leave: ${roomMembersAfter?.size || 0}`);
        if (roomMembersAfter && roomMembersAfter.size > 0) {
            console.log(`   Member socket IDs: [${Array.from(roomMembersAfter).map(id => `'${id}'`).join(', ')}]`);
        }

        // Notify other members that a user has left
        io.to(roomName).emit('user:left:chat', {
            userId,
            roomName,
            timestamp: new Date().toISOString()
        });

        // BROADCAST: Emit leave notification to ALL connected sockets (matching direct message pattern)
        io.emit('user:left:shop:chat', {
            userId,
            roomName,
            timestamp: new Date().toISOString()
        });
        console.log(`💬 [SHOP CHAT] room: ${roomName}:📢 BROADCAST: Message emitted to ALL connected sockets`);
    });

    // Shop chat message handling - Mirrors direct message format from Laravel
    socket.on("shop:chat:message", async (data) => {
        const { shopId, shopName, shopOwnerId, senderId, senderName, message, roomName, timestamp } = data;

        // Format like: 💬 [CHAT MESSAGE] Received from Laravel
        console.log(`\n💬 [SHOP CHAT MESSAGE] Received from Frontend Client`);
        console.log(`   Sender ID: ${senderId}`);
        console.log(`   Sender Name: ${senderName}`);
        console.log(`   Message: ${message}`);
        console.log(`   Shop Chat Room: ${roomName}`);

        // Validate required fields
        if (!shopId || !senderId || !senderName || !message || !roomName) {
            console.error(`❌ [SHOP CHAT MESSAGE] Missing required fields!`);
            socket.emit('shop:chat:message:error', {
                error: 'Missing required fields',
                received: { shopId, senderId, senderName, message, roomName }
            });
            return;
        }

        // Create the chat message object
        const chatMessage = {
            shopId,
            shopName,
            shopOwnerId,
            senderId,
            senderName,
            message,
            roomName,
            timestamp: timestamp || new Date().toISOString()
        };

        // Check who's in the room before emitting (matching direct message format)
        const roomMembers = io.sockets.adapter.rooms.get(roomName);
        console.log(`📊 Room ${roomName} has ${roomMembers ? roomMembers.size : 0} members:`, roomMembers ? Array.from(roomMembers) : []);

        // Save to database asynchronously (don't wait for response)
        saveShopMessageToDatabase({
            shopId,
            userId: senderId,
            shopOwnerId,
            message,
            timestamp: timestamp || new Date().toISOString()
        }).then(dbResult => {
            if (dbResult) {
                console.log(`✅ [SHOP CHAT MESSAGE] Database save completed - Record ID: ${dbResult.data?.id || dbResult.id || 'unknown'}`);
            }
        }).catch(err => {
            console.error(`❌ [SHOP CHAT MESSAGE] Database save failed:`, err.message);
        });

        // Emit to the specific chat room (targeted broadcast)
        io.to(roomName).emit('shop:chat:message', chatMessage);
        console.log(`✅ Message emitted to room: ${roomName} (${roomMembers ? roomMembers.size : 0} users in room)`);

        // Also emit acknowledgment back to sender
        socket.emit('shop:chat:message:ack', {
            roomName,
            timestamp,
            status: 'sent'
        });

        // Log all registered users (matching direct message format)
        console.log(`📋 Registered users:`, Array.from(userIdToSocket.entries()));

        // Also emit directly to shop owner's socket if connected (matching direct message format)
        const shopOwnerSocketId = userIdToSocket.get(shopOwnerId.toString());
        if (shopOwnerSocketId) {
            io.to(shopOwnerSocketId).emit('shop:chat:message', chatMessage);
            console.log(`✅ Direct message to shop owner socket: ${shopOwnerSocketId}`);

            // Verify socket exists
            const shopOwnerSocket = io.sockets.sockets.get(shopOwnerSocketId);
            console.log(`   Shop owner socket connected: ${shopOwnerSocket ? 'YES' : 'NO'}`);
        } else {
            console.log(`⚠️  Shop owner ${shopOwnerId} not found in userIdToSocket map`);
        }

        // Also emit directly to sender's socket if connected (matching direct message format)
        const senderSocketId = userIdToSocket.get(senderId ? senderId.toString() : null);
        if (senderSocketId) {
            io.to(senderSocketId).emit('shop:chat:message', chatMessage);
            console.log(`✅ Direct message to sender socket: ${senderSocketId}`);

            // Verify socket exists
            const senderSocket = io.sockets.sockets.get(senderSocketId);
            console.log(`   Sender socket connected: ${senderSocket ? 'YES' : 'NO'}`);
        } else {
            console.log(`⚠️  Sender ${senderId} not found in userIdToSocket map`);
        }

        // FALLBACK: Emit to ALL connected sockets (let frontend filter by shop_id)
        io.emit('shop:chat:message', chatMessage);
        console.log(`💬 [SHOP CHAT] room: ${roomName}:📢 BROADCAST: Message emitted to ALL connected sockets`);
    });

    // Handle shop message replies - join reply chat room
    socket.on("join:chat:room", ({ userId, roomName }) => {
        console.log(`\n💬 [SHOP MESSAGE REPLY] User ${userId} joining reply chat room: ${roomName}`);
        socket.join(roomName);
        console.log(`✅ User ${socket.id} (ID: ${userId}) joined reply chat room: ${roomName}`);

        // Notify others in the room that user has joined
        io.to(roomName).emit('user:joined:room', {
            userId,
            roomName,
            socketId: socket.id,
            timestamp: new Date().toISOString()
        });
    });

    // Group chat message handling - send from frontend group chat
    socket.on("group-message", (data, callback) => {
        const { groupId, message, userId, timestamp } = data;

        console.log(`\n👥 [GROUP CHAT MESSAGE] Received from frontend`);
        console.log(`   Group ID: ${groupId}`);
        console.log(`   User ID: ${userId}`);
        console.log(`   Message: ${message}`);
        console.log(`   Message Length: ${message.length}`);
        console.log(`   Timestamp: ${timestamp}`);
        console.log(`   Socket ID: ${socket.id}`);

        // Validate required fields
        if (!groupId || !message || !userId) {
            console.error(`❌ [GROUP CHAT MESSAGE] Missing required fields!`);
            if (callback) {
                callback({
                    success: false,
                    error: 'Missing required fields (groupId, message, userId)'
                });
            }
            return;
        }

        // Create the group chat message object
        const groupMessage = {
            groupId,
            userId,
            message,
            timestamp: timestamp || new Date().toISOString(),
            socketId: socket.id
        };

        // Get the room name for this group
        const roomName = `group-${groupId}`;

        // Check who's in the group room
        const roomMembers = io.sockets.adapter.rooms.get(roomName);
        console.log(`📊 Room "${roomName}" has ${roomMembers ? roomMembers.size : 0} members`);
        if (roomMembers && roomMembers.size > 0) {
            console.log(`   Member socket IDs: [${Array.from(roomMembers).map(id => `'${id}'`).join(', ')}]`);
        }

        // Broadcast message to group room
        io.to(roomName).emit('group-message', groupMessage);
        console.log(`✅ [GROUP CHAT MESSAGE] Broadcasted to room: ${roomName}`);

        // Also broadcast to ALL connected sockets (fallback for discovery)
        io.emit('group-message', groupMessage);
        console.log(`📢 [GROUP CHAT MESSAGE] FALLBACK: Broadcasted to ALL connected sockets`);

        // Send acknowledgment back to sender with success
        if (callback) {
            callback({
                success: true,
                data: {
                    id: socket.id,
                    groupId,
                    timestamp: new Date().toISOString()
                }
            });
            console.log(`✅ [GROUP CHAT MESSAGE] Acknowledgment sent to sender`);
        }
    });

    // Join group chat room
    socket.on("join-group-chat", ({ groupId, userId }) => {
        const roomName = `group-${groupId}`;
        console.log(`\n👥 [GROUP CHAT] User ${userId} joining group ${groupId}`);
        console.log(`   Room Name: ${roomName}`);
        console.log(`   Socket ID: ${socket.id}`);

        socket.join(roomName);

        const roomMembers = io.sockets.adapter.rooms.get(roomName);
        console.log(`✅ [GROUP CHAT] User joined room - now ${roomMembers?.size || 1} members in room`);

        // Map user to this socket for direct messaging
        userIdToSocket.set(userId.toString(), socket.id);
        socketToUserId.set(socket.id, userId.toString());
        console.log(`📍 [GROUP CHAT] Mapped user ${userId} to socket ${socket.id}`);
    });

    // Leave group chat room
    socket.on("leave-group-chat", ({ groupId, userId }) => {
        const roomName = `group-${groupId}`;
        console.log(`\n👥 [GROUP CHAT] User ${userId} leaving group ${groupId}`);
        console.log(`   Room Name: ${roomName}`);

        socket.leave(roomName);

        const roomMembers = io.sockets.adapter.rooms.get(roomName);
        console.log(`✅ [GROUP CHAT] User left room - now ${roomMembers?.size || 0} members in room`);
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