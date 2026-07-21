import React from 'react';
import { useSocket } from './hooks/useSocket';
import { Navbar } from './components/Navbar';
import { HomeScreen } from './components/HomeScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { RoundCluePhase } from './components/RoundCluePhase';
import { ClueRevealPhase } from './components/ClueRevealPhase';
import { VotingPhase } from './components/VotingPhase';
import { GameOverPhase } from './components/GameOverPhase';

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
    startGame,
    submitClue,
    vote,
    playAgain,
    leaveRoom,
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

      case 'VOTING':
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
            error={error}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090714] text-white">
      <Navbar
        roomCode={roomState?.code}
        isConnected={isConnected}
        onLeaveRoom={roomState ? leaveRoom : undefined}
      />
      <main className="flex-1 flex flex-col items-center justify-center relative pb-12">
        {renderCurrentPhase()}
      </main>
    </div>
  );
};

export default App;
