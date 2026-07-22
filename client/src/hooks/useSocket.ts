import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { RoomPublicState, PersonalRolePayload, GameSettings, DecisionOption } from '../types/game';
import { sound } from '../services/sound';
import { useToast } from '../context/ToastContext';

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
  
  const { showSuccess, showError, showInfo } = useToast();

  const prevTimerRef = useRef<number>(-1);
  const prevPhaseRef = useRef<string>('');
  const prevConnectedRef = useRef<boolean>(false);

  useEffect(() => {
    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    setSocket(s);

    s.on('connect', () => {
      setIsConnected(true);
      setError(null);
      if (prevConnectedRef.current === false) {
        // Connected!
      }
      prevConnectedRef.current = true;

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
      if (prevConnectedRef.current) {
        showError('Server Disconnected');
      }
      prevConnectedRef.current = false;
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
      const msg = `Host changed! ${data.newHostName} is now the host.`;
      setError(msg);
      showInfo(msg);
      setTimeout(() => setError(null), 4000);
    });

    s.on('tie-break-triggered', () => {
      const msg = "Tie Break! Votes were tied. Revote among the tied candidates only.";
      setError(msg);
      showInfo(msg);
      setTimeout(() => setError(null), 4000);
    });

    return () => {
      s.disconnect();
    };
  }, [showError, showInfo]);

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
          showSuccess('Room Created');
          resolve(true);
        } else {
          const msg = res.message || 'Failed to create room';
          setError(msg);
          showError(msg);
          resolve(false);
        }
      });
    });
  }, [socket, showSuccess, showError]);

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
          showSuccess('Room Joined');
          resolve(true);
        } else {
          const msg = res.message || 'Failed to join room';
          setError(msg);
          showError(msg);
          resolve(false);
        }
      });
    });
  }, [socket, showSuccess, showError]);

  const toggleReady = useCallback(() => {
    if (!socket || !roomState) return;
    socket.emit('toggle-ready', { code: roomState.code });
    sound.playSubmit();
  }, [socket, roomState]);

  const submitDecision = useCallback((decision: DecisionOption): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socket || !roomState) return resolve(false);
      socket.emit('submit-decision', { code: roomState.code, decision }, (res: { success: boolean; message?: string }) => {
        if (res.success) {
          setError(null);
          sound.playSubmit();
          showInfo('Decision Submitted');
          resolve(true);
        } else {
          const msg = res.message || 'Failed to submit decision';
          setError(msg);
          showError(msg);
          resolve(false);
        }
      });
    });
  }, [socket, roomState, showInfo, showError]);

  const updateSettings = useCallback((settings: GameSettings) => {
    if (!socket || !roomState) return;
    socket.emit('update-settings', { code: roomState.code, settings });
  }, [socket, roomState]);

  const startGame = useCallback((customCivilianWord?: string, customImposterWord?: string) => {
    if (!socket || !roomState) return;
    socket.emit(
      'start-game',
      { code: roomState.code, customCivilianWord, customImposterWord },
      (res: { success: boolean; message?: string }) => {
        if (!res.success) {
          const msg = res.message || 'Failed to start game';
          setError(msg);
          showError(msg);
        } else {
          showSuccess('Game Started');
        }
      }
    );
  }, [socket, roomState, showError, showSuccess]);

  const submitClue = useCallback((clue: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socket || !roomState) return resolve(false);
      socket.emit('submit-clue', { code: roomState.code, clue }, (res: { success: boolean; message?: string }) => {
        if (res.success) {
          setError(null);
          sound.playSubmit();
          showInfo('Waiting for Players');
          resolve(true);
        } else {
          const msg = res.message || 'Failed to submit clue';
          setError(msg);
          showError(msg);
          resolve(false);
        }
      });
    });
  }, [socket, roomState, showInfo, showError]);

  const vote = useCallback((targetId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socket || !roomState) return resolve(false);
      socket.emit('vote', { code: roomState.code, targetId }, (res: { success: boolean; message?: string }) => {
        if (res.success) {
          setError(null);
          sound.playSubmit();
          showSuccess('Vote Submitted');
          resolve(true);
        } else {
          const msg = res.message || 'Failed to submit vote';
          setError(msg);
          showError(msg);
          resolve(false);
        }
      });
    });
  }, [socket, roomState, showSuccess, showError]);

  const playAgain = useCallback(() => {
    if (!socket || !roomState) return;
    socket.emit('play-again', { code: roomState.code }, (res: { success: boolean; message?: string }) => {
      if (!res.success) {
        const msg = res.message || 'Failed to restart game';
        setError(msg);
        showError(msg);
      } else {
        setMyRolePayload(null);
      }
    });
  }, [socket, roomState, showError]);

  const leaveRoom = useCallback(() => {
    localStorage.removeItem('imposter_room_code');
    setRoomState(null);
    setMyRolePayload(null);
    if (socket) {
      socket.disconnect();
      socket.connect();
    }
  }, [socket]);

  const sendChatMessage = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socket || !roomState) return resolve(false);
      socket.emit('send-chat-message', { code: roomState.code, message }, (res: { success: boolean }) => {
        resolve(res?.success || false);
      });
    });
  }, [socket, roomState]);

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
    submitDecision,
    updateSettings,
    startGame,
    submitClue,
    vote,
    playAgain,
    leaveRoom,
    sendChatMessage,
    clearError,
  };
}
