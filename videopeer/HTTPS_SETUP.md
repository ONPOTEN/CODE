# VideoPeer Socket.IO HTTPS Setup with server.pfx

## Overview

VideoPeer Socket.IO server now runs on HTTPS using the self-signed certificate (`server.pfx`) for `www.centimet2.com`.

## Configuration Files

### index.js (Updated)
- **Location**: `videopeer/index.js`
- **Key Features**:
  - HTTPS server using Node.js `https` module
  - Socket.IO configured for WebRTC signaling
  - PFX certificate loading with fallback logic
  - Environment variable support (PORT, HOSTNAME)
  - Certificate validation on startup
  - Detailed console output
  - Proper error handling

### server.pfx (Certificate)
- **Primary**: `videopeer/server.pfx` ✓
- **Fallback**: `../laravel-api/server.pfx`

## Quick Start

### Option 1: Using NPM Script
```bash
cd "d:\09092025\17102025api\videopeer"
npm start
```

### Option 2: Using Node Directly
```bash
cd "d:\09092025\17102025api\videopeer"
node index.js
```

### Option 3: Using Batch Script (Windows)
```bash
cd "d:\09092025\17102025api\videopeer"
start-https.bat
```

### Option 4: Using Environment Variables
```bash
cd "d:\09092025\17102025api\videopeer"
PORT=3000 HOSTNAME=0.0.0.0 node index.js
```

## Expected Output

```
==================================================
VideoPeer Socket.IO HTTPS Server Configuration
==================================================

Hostname: 0.0.0.0
Port: 3000
PFX Path: .../videopeer/server.pfx ✓ Found

==================================================
✓ VideoPeer Socket.IO HTTPS Server Started Successfully
==================================================

🔒 Secure URL: https://www.centimet2.com:3000
🔒 Alt URL: https://localhost:3000
📦 Certificate: server.pfx (self-signed for www.centimet2.com)
🔌 Socket.IO: Ready for WebRTC signaling

⚠️  Browser will show a security warning - this is normal for development.

Press Ctrl+C to stop the server

Socket Connected: <socket-id>
```

## Access Points

### Socket.IO HTTPS (WebRTC Signaling)
- **IP-based**: `https://www.centimet2.com:3000`
- **Localhost**: `https://localhost:3000`
- **Port**: 3000
- **Certificate**: server.pfx (self-signed)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ WebRTC Client (Browser)                             │
│ - Video/Audio/Data channels                        │
│ Connects to: https://www.centimet2.com:3000            │
└──────────────────┬──────────────────────────────────┘
                   │ HTTPS (Port 3000)
                   │ Certificate: server.pfx
                   │ WebSocket over TLS
                   ▼
┌─────────────────────────────────────────────────────┐
│ VideoPeer Socket.IO Server (index.js)              │
│ - HTTPS: https://0.0.0.0:3000                      │
│ - Uses: server.pfx (PKCS#12)                       │
│ - WebRTC Signaling:                                │
│   • Room management                                │
│   • User joining/leaving                           │
│   • SDP offer/answer exchange                      │
│   • ICE candidate exchange                         │
│   • Chat messaging                                 │
└─────────────────────────────────────────────────────┘
```

## Socket.IO Events

### Connection Events
```javascript
socket.on("connection") // New client connected
socket.on("disconnect") // Client disconnected
```

### Room Management
```javascript
socket.on("room:join")        // User joins a room
socket.on("room:invite")      // Invite user to room
socket.on("call:prep")        // Prepare for call (send room ID)
```

### WebRTC Signaling
```javascript
socket.on("user:call")        // Send video call offer
socket.on("incoming:call")    // Receive video call offer
socket.on("call:accepted")    // Accept call (send answer)
socket.on("peer:nego:needed") // Send renegotiation offer
socket.on("peer:nego:final")  // Send renegotiation answer
socket.on("call:end")         // End call
socket.on("call:initiated")   // Call initiated
```

### Chat & Presence
```javascript
socket.on("chat:message")     // Send chat message
socket.on("chat:typing")      // User is typing indicator
```

## Configuration Details

### Certificate Loading

```javascript
// Primary location
const pfxPath = path.join(__dirname, 'server.pfx');

// Fallback location
const pfxPathFallback = path.join(__dirname, '..', 'laravel-api', 'server.pfx');

// Automatic fallback if primary not found
let finalPfxPath = pfxPath;
if (!fs.existsSync(pfxPath)) {
  finalPfxPath = pfxPathFallback;
}

// Load HTTPS options
const serverOptions = {
  pfx: fs.readFileSync(finalPfxPath),
  passphrase: '' // Empty passphrase
};
```

### HTTPS Server Creation

```javascript
const server = https.createServer(serverOptions, app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: false
    }
});

server.listen(PORT, HOSTNAME);
```

## Browser Security Warning

When accessing `https://www.centimet2.com:3000`, you'll see a security warning because the certificate is self-signed.

**This is normal and expected** for development.

**To accept the certificate:**

**Chrome/Edge:**
1. Click "Advanced"
2. Click "Proceed to www.centimet2.com (unsafe)"

**Firefox:**
1. Click "Advanced..."
2. Click "Accept the Risk and Continue"

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | Server port number |
| `HOSTNAME` | `0.0.0.0` | Server hostname/bind address |
| `NODE_ENV` | `development` | Environment mode |

### Example:
```bash
PORT=5000 HOSTNAME=www.centimet2.com node index.js
```

## Client-Side Usage

### Connecting to Socket.IO

```javascript
import io from 'socket.io-client';

// Connect with HTTPS
const socket = io('https://www.centimet2.com:3000', {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
});

// Handle connection
socket.on('connect', () => {
    console.log('Connected to Socket.IO server');
});

// Join a room
socket.emit('room:join', {
    email: 'user@example.com',
    room: 'room-123',
    userId: 625
});

// Listen for user joined
socket.on('user:joined', (data) => {
    console.log('User joined:', data);
});
```

### Making a WebRTC Call

```javascript
// Send video call offer
socket.emit('user:call', {
    to: remoteSocketId,
    offer: sdpOffer
});

// Listen for incoming call
socket.on('incoming:call', ({ from, offer }) => {
    console.log('Incoming call from:', from);
    // Create answer and send back
    socket.emit('call:accepted', {
        to: from,
        ans: sdpAnswer
    });
});
```

## Troubleshooting

### Port 3000 Already in Use
```bash
# Find process
netstat -ano | findstr ":3000"

# Kill process (Windows)
taskkill /PID <PID> /F
```

### PFX Certificate Not Found
**Error:**
```
✗ ERROR: PFX certificate not found at:
  - .../videopeer/server.pfx
  - .../laravel-api/server.pfx
```

**Solution:**
```bash
# Copy certificate from laravel-api
cp "laravel-api/server.pfx" "videopeer/server.pfx"

# Or generate new one
cd laravel-api
openssl pkcs12 -export -out server.pfx -inkey server.key -in server.crt -password pass:""
cp server.pfx ../videopeer/
```

### Invalid Passphrase Error
**Error:**
```
Error: error:0x06a88084
```

**Solution:** Certificate was created with wrong passphrase. Regenerate with empty passphrase:
```bash
cd laravel-api
openssl pkcs12 -export -out server.pfx -inkey server.key -in server.crt -password pass:""
```

### CORS Issues
If you get CORS errors:
1. Check browser console for specific error
2. Verify Socket.IO client connects to correct URL
3. Ensure CORS is enabled in Socket.IO config:
   ```javascript
   cors: {
       origin: "*",
       methods: ["GET", "POST"],
       credentials: false
   }
   ```

### WebRTC Connection Issues
1. Ensure both clients connect to Socket.IO successfully
2. Check browser console for ICE candidate errors
3. Verify firewall allows HTTPS on port 3000
4. Test with `stun:stun.l.google.com:19302` STUN server

## File Locations

```
videopeer/
├── index.js                  # ✓ HTTPS Socket.IO server (UPDATED)
├── server.pfx              # ✓ SSL certificate (PFX format)
├── start-https.bat         # ✓ Windows startup script
├── package.json
├── node_modules/
└── HTTPS_SETUP.md         # This file
```

## Changes Made

### What Changed:
1. ✅ Uses new server.pfx certificate (www.centimet2.com)
2. ✅ Certificate loading with fallback paths
3. ✅ Environment variable support (PORT, HOSTNAME)
4. ✅ Certificate validation on startup
5. ✅ Better error messages and logging
6. ✅ Improved console output with connection details

### Backward Compatibility:
- Socket.IO events unchanged
- WebRTC signaling unchanged
- Client code needs minor HTTPS URL update
- Configuration is self-documenting

## Testing

### Test 1: Verify Server Starts
```bash
cd videopeer
node index.js
# Should show: "✓ VideoPeer Socket.IO HTTPS Server Started Successfully"
```

### Test 2: Check Connection
```javascript
// In browser console
const socket = io('https://www.centimet2.com:3000');
socket.on('connect', () => console.log('Connected!'));
```

### Test 3: Full Integration Test
1. Terminal: `node index.js`
2. Open browser: `https://www.centimet2.com:3000`
3. Accept security warning
4. Check console for "Socket Connected: <socket-id>"

## Additional Resources

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Node.js HTTPS Module](https://nodejs.org/api/https.html)
- [WebRTC Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [PKCS#12 Format](https://en.wikipedia.org/wiki/PKCS_12)

## Summary

VideoPeer is now configured to:
- ✅ Run on HTTPS with server.pfx
- ✅ Support WebRTC signaling
- ✅ Handle Socket.IO connections
- ✅ Work with www.centimet2.com:3000
- ✅ Validate certificates on startup
- ✅ Provide detailed error messages
