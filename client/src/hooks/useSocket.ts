import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { RoomPublicState, PersonalRolePayload, GameSettings } from '../types/game';
import { sound } from '../services/sound';

function getSessionId(): string {
  let id = localStorage.getItem('imposter_session_id');
  if (!id) {
    id = 'sess_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    localStorage.setItem('imposter_session_id', id);
  }
  return id;
}

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || `${window.location.protocol}//${window.location.hostname}:3001`;

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [roomState, setRoomState] = useState<RoomPublicState | null>(null);
  const [myRolePayload, setMyRolePayload] = useState<PersonalRolePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>(() => localStorage.getItem('imposter_player_name') || '');
  
  const prevTimerRef = useRef<number>(-1);
  const prevPhaseRef = useRef<string>('');

  useEffect(() => {
    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    setSocket(s);

    s.on('connect', () => {
      setIsConnected(true);
      setError(null);

      // Attempt auto-reconnect if session exists
      const savedCode = localStorage.getItem('imposter_room_code');
      const sessionId = getSessionId();
      if (savedCode) {
        s.emit('reconnect-session', { code: savedCode, sessionId }, (res: { success: boolean }) => {
          if (!res.success) {
            localStorage.removeItem('imposter_room_code');
            setRoomState(null);
          }
        });
      }
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('room-state', (state: RoomPublicState) => {
      setRoomState(state);

      // Handle sound triggers on timer ticks
      if (state.timerSeconds <= 5 && state.timerSeconds > 0 && state.timerSeconds !== prevTimerRef.current) {
        sound.playTick();
      }
      prevTimerRef.current = state.timerSeconds;

      // Handle sound triggers on victory/defeat phase change
      if (state.phase === 'GAME_OVER' && prevPhaseRef.current !== 'GAME_OVER') {
        if (state.winner === 'CIVILIANS') {
          sound.playVictory();
        } else {
          sound.playDefeat();
        }
      }

      prevPhaseRef.current = state.phase;
    });

    s.on('assign-role', (payload: PersonalRolePayload) => {
      setMyRolePayload(payload);
    });

    s.on('host-changed', (data: { newHostName: string }) => {
      setError(`Host changed! ${data.newHostName} is now the host.`);
      setTimeout(() => setError(null), 4000);
    });

    s.on('tie-break-triggered', () => {
      setError("Tie Break! Votes were tied. Revote among the tied candidates only.");
      setTimeout(() => setError(null), 4000);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const createRoom = useCallback((name: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socket) return resolve(false);
      const sessionId = getSessionId();
      setPlayerName(name);
      localStorage.setItem('imposter_player_name', name);

      socket.emit('create-room', { name, sessionId }, (res: { success: boolean; code?: string; message?: string }) => {
        if (res.success && res.code) {
          localStorage.setItem('imposter_room_code', res.code);
          setError(null);
          sound.playJoin();
          resolve(true);
        } else {
          setError(res.message || 'Failed to create room');
          resolve(false);
        }
      });
    });
  }, [socket]);

  const joinRoom = useCallback((code: string, name: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socket) return resolve(false);
      const sessionId = getSessionId();
      setPlayerName(name);
      localStorage.setItem('imposter_player_name', name);

      socket.emit('join-room', { code, name, sessionId }, (res: { success: boolean; message?: string }) => {
        if (res.success) {
          localStorage.setItem('imposter_room_code', code.toUpperCase());
          setError(null);
          sound.playJoin();
          resolve(true);
        } else {
          setError(res.message || 'Failed to join room');
          resolve(false);
        }
      });
    });
  }, [socket]);

  const toggleReady = useCallback(() => {
    if (!socket || !roomState) return;
    socket.emit('toggle-ready', { code: roomState.code });
    sound.playSubmit();
  }, [socket, roomState]);

  const updateSettings = useCallback((settings: GameSettings) => {
    if (!socket || !roomState) return;
    socket.emit('update-settings', { code: roomState.code, settings });
  }, [socket, roomState]);

  const startGame = useCallback(() => {
    if (!socket || !roomState) return;
    socket.emit('start-game', { code: roomState.code }, (res: { success: boolean; message?: string }) => {
      if (!res.success) {
        setError(res.message || 'Failed to start game');
      }
    });
  }, [socket, roomState]);

  const submitClue = useCallback((clue: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socket || !roomState) return resolve(false);
      socket.emit('submit-clue', { code: roomState.code, clue }, (res: { success: boolean; message?: string }) => {
        if (res.success) {
          setError(null);
          sound.playSubmit();
          resolve(true);
        } else {
          setError(res.message || 'Failed to submit clue');
          resolve(false);
        }
      });
    });
  }, [socket, roomState]);

  const vote = useCallback((targetId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socket || !roomState) return resolve(false);
      socket.emit('vote', { code: roomState.code, targetId }, (res: { success: boolean; message?: string }) => {
        if (res.success) {
          setError(null);
          sound.playSubmit();
          resolve(true);
        } else {
          setError(res.message || 'Failed to submit vote');
          resolve(false);
        }
      });
    });
  }, [socket, roomState]);

  const playAgain = useCallback(() => {
    if (!socket || !roomState) return;
    socket.emit('play-again', { code: roomState.code }, (res: { success: boolean; message?: string }) => {
      if (!res.success) {
        setError(res.message || 'Failed to restart game');
      } else {
        setMyRolePayload(null);
      }
    });
  }, [socket, roomState]);

  const leaveRoom = useCallback(() => {
    localStorage.removeItem('imposter_room_code');
    setRoomState(null);
    setMyRolePayload(null);
    if (socket) {
      socket.disconnect();
      socket.connect();
    }
  }, [socket]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    socketId: socket?.id,
    isConnected,
    roomState,
    myRolePayload,
    error,
    playerName,
    createRoom,
    joinRoom,
    toggleReady,
    updateSettings,
    startGame,
    submitClue,
    vote,
    playAgain,
    leaveRoom,
    clearError,
  };
}
