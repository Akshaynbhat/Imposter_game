import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { RoomManager } from './roomManager.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager(io);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

io.on('connection', (socket) => {
  // 1. Create Room
  socket.on('create-room', ({ name, sessionId }, callback) => {
    try {
      const { code, player } = roomManager.createRoom(socket, name, sessionId);
      if (typeof callback === 'function') {
        callback({ success: true, code, player });
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, message: err?.message || 'Failed to create room' });
      }
    }
  });

  // 2. Join Room
  socket.on('join-room', ({ code, name, sessionId }, callback) => {
    try {
      const result = roomManager.joinRoom(socket, code, name, sessionId);
      if (typeof callback === 'function') {
        callback(result);
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, message: err?.message || 'Failed to join room' });
      }
    }
  });

  // 3. Reconnect Session
  socket.on('reconnect-session', ({ code, sessionId }, callback) => {
    try {
      const success = roomManager.reconnect(socket, code, sessionId);
      if (typeof callback === 'function') {
        callback({ success });
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false });
      }
    }
  });

  // 4. Start Game
  socket.on('start-game', ({ code }, callback) => {
    try {
      const result = roomManager.startGame(socket, code);
      if (typeof callback === 'function') {
        callback(result);
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, message: err?.message || 'Failed to start game' });
      }
    }
  });

  // 5. Submit Clue
  socket.on('submit-clue', ({ code, clue }, callback) => {
    try {
      const result = roomManager.submitClue(socket, code, clue);
      if (typeof callback === 'function') {
        callback(result);
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, message: err?.message || 'Failed to submit clue' });
      }
    }
  });

  // 6. Submit Vote
  socket.on('vote', ({ code, targetId }, callback) => {
    try {
      const result = roomManager.submitVote(socket, code, targetId);
      if (typeof callback === 'function') {
        callback(result);
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, message: err?.message || 'Failed to submit vote' });
      }
    }
  });

  // 7. Play Again
  socket.on('play-again', ({ code }, callback) => {
    try {
      const result = roomManager.playAgain(socket, code);
      if (typeof callback === 'function') {
        callback(result);
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, message: err?.message || 'Failed to reset game' });
      }
    }
  });

  // 8. Disconnect
  socket.on('disconnect', () => {
    roomManager.handleDisconnect(socket);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🎮 Imposter Clues server running on port ${PORT}`);
});
