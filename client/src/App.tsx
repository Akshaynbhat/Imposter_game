import React from 'react';
import { useSocket } from './hooks/useSocket';
import { Navbar } from './components/Navbar';
import { HomeScreen } from './components/HomeScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { RoundCluePhase } from './components/RoundCluePhase';
import { ClueRevealPhase } from './components/ClueRevealPhase';
import { DiscussionPhase } from './components/DiscussionPhase';
import { VotingPhase } from './components/VotingPhase';
import { GameOverPhase } from './components/GameOverPhase';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Play, UserX } from 'lucide-react';

export const App: React.FC = () => {
  const {
    socketId,
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
    sendChatMessage,
    clearError,
  } = useSocket();

  const renderCurrentPhase = () => {
    if (!roomState) {
      return (
        <HomeScreen
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          initialName={playerName}
          error={error}
          clearError={clearError}
        />
      );
    }

    switch (roomState.phase) {
      case 'LOBBY':
        return (
          <LobbyScreen
            roomState={roomState}
            myId={socketId}
            onStartGame={startGame}
            onToggleReady={toggleReady}
            onUpdateSettings={updateSettings}
            error={error}
          />
        );

      case 'ROUND_1':
      case 'ROUND_2':
        return (
          <RoundCluePhase
            roomState={roomState}
            rolePayload={myRolePayload}
            myId={socketId}
            onSubmitClue={submitClue}
          />
        );

      case 'CLUES_REVEAL_1':
      case 'CLUES_REVEAL_2':
        return <ClueRevealPhase roomState={roomState} myId={socketId} />;

      case 'DISCUSSION_1':
      case 'DISCUSSION_2':
        return <DiscussionPhase roomState={roomState} myId={socketId} onSendMessage={sendChatMessage} />;

      case 'VOTING':
      case 'TIE_BREAK_VOTING':
        return <VotingPhase roomState={roomState} myId={socketId} onVote={vote} />;

      case 'GAME_OVER':
        return (
          <GameOverPhase
            roomState={roomState}
            myId={socketId}
            onPlayAgain={playAgain}
            onLeaveRoom={leaveRoom}
          />
        );

      default:
        return (
          <LobbyScreen
            roomState={roomState}
            myId={socketId}
            onStartGame={startGame}
            onToggleReady={toggleReady}
            onUpdateSettings={updateSettings}
            error={error}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090714] text-white overflow-x-hidden">
      <Navbar
        roomCode={roomState?.code}
        isConnected={isConnected}
        onLeaveRoom={roomState ? leaveRoom : undefined}
      />
      
      <main className="flex-1 flex flex-col items-center justify-center relative pb-12 w-full max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={roomState ? `${roomState.code}-${roomState.phase}-${roomState.currentRound}` : 'home'}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="w-full flex justify-center"
          >
            {renderCurrentPhase()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* DISCONNECT / PAUSE OVERLAY */}
      <AnimatePresence>
        {roomState && roomState.isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full glass-panel rounded-3xl p-8 border border-rose-500/40 text-center shadow-[0_0_30px_rgba(244,63,94,0.25)]"
            >
              <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-500/40">
                <UserX className="w-8 h-8 animate-pulse" />
              </div>
              
              <h2 className="text-2xl font-black text-white mb-2 neon-text-red">
                Game Paused
              </h2>
              
              <p className="text-sm text-purple-200 leading-relaxed mb-6">
                A crew member has disconnected! We need at least <strong className="text-neon-cyan">3 connected players</strong> to keep playing. Waiting for them to reconnect...
              </p>

              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-purple-300">
                <Clock className="w-4 h-4 animate-spin text-neon-cyan" />
                <span>Monitoring connection pool...</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
