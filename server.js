import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

let gameState = {
  users: {},
  chat: [],
  bannedUsers: [],
  adminUsers: [],
  market: [],
  posts: [],
  clans: {},
  globalLuckBoost: null,
  onlinePresence: {}
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join', (username) => {
    socket.username = username;
    gameState.onlinePresence[username] = socket.id;
    io.emit('stateUpdate', { onlinePresence: gameState.onlinePresence });
  });
  
  socket.on('chat', (data) => {
    const msg = { from: data.from, body: data.body, ts: Date.now() };
    gameState.chat.push(msg);
    if (gameState.chat.length > 800) gameState.chat = gameState.chat.slice(-800);
    io.emit('chat', msg);
  });
  
  socket.on('saveUser', (data) => {
    gameState.users[data.name] = data;
    socket.emit('userSaved', { ok: true });
  });
  
  socket.on('getUser', (name) => {
    socket.emit('userData', gameState.users[name]);
  });
  
  socket.on('getChat', () => {
    socket.emit('chatHistory', gameState.chat);
  });
  
  socket.on('getState', () => {
    socket.emit('fullState', gameState);
  });
  
  socket.on('update', (data) => {
    if (data.key && data.value !== undefined) {
      gameState[data.key] = data.value;
      io.emit('stateUpdate', { [data.key]: data.value });
    }
  });
  
  socket.on('disconnect', () => {
    if (socket.username) {
      delete gameState.onlinePresence[socket.username];
      io.emit('stateUpdate', { onlinePresence: gameState.onlinePresence });
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname)));

app.get('/api/state', (req, res) => res.json(gameState));
app.get('/api/chat', (req, res) => res.json({ chat: gameState.chat }));

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});