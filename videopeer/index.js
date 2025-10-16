const { Server } = require('socket.io');
const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

// Read SSL certificate files
const serverOptions = {
  pfx: fs.readFileSync('centimet2.pfx'),
  passphrase: 'laravel' // Only if your PFX is protected
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

const emailToSocket = new Map();
const socketToEmail = new Map();

io.on("connection", (socket) => {
    console.log(`Socket Connected: ${socket.id}`);
    
    socket.on("room:join", data => {
        const { email, room } = data;
        console.log(`User ${email} joining room ${room}`);
        
        emailToSocket.set(email, socket.id);
        socketToEmail.set(socket.id, email);
        
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

    socket.on("user:call", ({ to, offer }) => {
        console.log(`Call from ${socket.id} to ${to}`);
        io.to(to).emit("incoming:call", { from: socket.id, offer });
    });

    socket.on("call:accepted", ({ to, ans }) => {
        io.to(to).emit("call:accepted", { from: socket.id, ans });
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
    });
});

server.listen(3000, '0.0.0.0', () => {
    console.log('Server running on port 3000');
});