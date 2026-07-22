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

  // 3b. Toggle Ready
  socket.on('toggle-ready', ({ code }, callback) => {
    try {
      const result = roomManager.toggleReady(socket, code);
      if (typeof callback === 'function') {
        callback(result);
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false });
      }
    }
  });

  // 3c. Update Settings
  socket.on('update-settings', ({ code, settings }, callback) => {
    try {
      const result = roomManager.updateSettings(socket, code, settings);
      if (typeof callback === 'function') {
        callback(result);
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, message: err?.message || 'Failed to update settings' });
      }
    }
  });

  // 4. Start Game
  socket.on('start-game', ({ code, customCivilianWord, customImposterWord }, callback) => {
    try {
      const result = roomManager.startGame(socket, code, customCivilianWord, customImposterWord);
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

  // 5b. Submit Post-Round Decision Vote
  socket.on('submit-decision', ({ code, decision }, callback) => {
    try {
      const result = roomManager.submitDecision(socket, code, decision);
      if (typeof callback === 'function') {
        callback(result);
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, message: err?.message || 'Failed to submit decision' });
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

  // 7. Play Again / Ready for Next Game
  socket.on('play-again', ({ code }, callback) => {
    try {
      const result = roomManager.playerReadyForNextGame(socket, code);
      if (typeof callback === 'function') {
        callback(result);
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, message: err?.message || 'Failed to set ready for next game' });
      }
    }
  });

  socket.on('ready-for-next-game', ({ code }, callback) => {
    try {
      const result = roomManager.playerReadyForNextGame(socket, code);
      if (typeof callback === 'function') {
        callback(result);
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, message: err?.message || 'Failed to set ready for next game' });
      }
    }
  });

  // 7b. Leave Room
  socket.on('leave-room', ({ code }, callback) => {
    try {
      const result = roomManager.leaveRoom(socket, code);
      if (typeof callback === 'function') {
        callback(result);
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false });
      }
    }
  });

  // 7b. Chat Messages
  socket.on('send-chat-message', ({ code, message }, callback) => {
    try {
      const success = roomManager.addChatMessage(socket, code, message);
      if (typeof callback === 'function') {
        callback({ success });
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false });
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
