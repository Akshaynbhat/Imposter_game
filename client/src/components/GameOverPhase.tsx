import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { PartyPopper, Skull, RotateCcw, Home, Crown, Trophy, AlertCircle } from 'lucide-react';
import { RoomPublicState } from '../types/game';

interface GameOverPhaseProps {
  roomState: RoomPublicState;
  myId?: string;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
}

export const GameOverPhase: React.FC<GameOverPhaseProps> = ({
  roomState,
  myId,
  onPlayAgain,
  onLeaveRoom,
}) => {
  const me = roomState.players.find((p) => p.id === myId);
  const isHost = me?.isHost ?? false;
  const isCivilianWin = roomState.winner === 'CIVILIANS';
  const eliminated = roomState.eliminatedPlayer;

  useEffect(() => {
    if (isCivilianWin) {
      // Trigger canvas confetti fireworks
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
      };

      function fire(particleRatio: number, opts: confetti.Options) {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      }

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
      });
      fire(0.2, {
        spread: 60,
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
      });
    }
  }, [isCivilianWin]);

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8">
      {/* Victory / Defeat Header Card */}
      <div
        className={`glass-panel rounded-3xl p-8 text-center border mb-6 shadow-2xl relative overflow-hidden ${
          isCivilianWin
            ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-950/40 via-purple-950/60 to-dark-900 shadow-emerald-900/30'
            : 'border-rose-600/60 bg-gradient-to-b from-rose-950/60 via-purple-950/80 to-dark-900 shadow-rose-950/50 animate-glow-pulse'
        }`}
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-4 p-1 shadow-xl">
          <div
            className={`w-full h-full rounded-[22px] flex items-center justify-center ${
              isCivilianWin ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-500'
            }`}
          >
            {isCivilianWin ? (
              <PartyPopper className="w-10 h-10 animate-bounce" />
            ) : (
              <Skull className="w-10 h-10 animate-pulse" />
            )}
          </div>
        </div>

        <h2
          className={`text-4xl sm:text-5xl font-black tracking-tight mb-2 ${
            isCivilianWin ? 'text-emerald-400 neon-text-blue' : 'text-rose-500 neon-text-red'
          }`}
        >
          {isCivilianWin ? '🎉 Civilians Win!' : '😈 Imposter Wins!'}
        </h2>

        <p className="text-sm font-semibold text-purple-200/90 mt-2">
          {eliminated ? (
            <span>
              <strong>{eliminated.name}</strong> was voted out{' '}
              {eliminated.isImposter ? '(The Imposter!)' : '(Innocent Civilian!)'}
            </span>
          ) : (
            'The voting has concluded!'
          )}
        </p>
      </div>

      {/* Secret Word & Role Matrix Reveal Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-purple-500/20 shadow-xl mb-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-purple-300 mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-neon-gold" /> Full Game Secret Word Reveal
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-2xl glass-card border border-purple-500/20 text-center">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Imposter Player</p>
            <p className="text-lg font-black text-rose-400 mt-1 truncate">
              {roomState.imposterName || 'Unknown'}
            </p>
          </div>

          <div className="p-4 rounded-2xl glass-card border border-purple-500/20 text-center">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Civilian Word</p>
            <p className="text-lg font-black text-neon-cyan mt-1 truncate">
              {roomState.civilianWord || '???'}
            </p>
          </div>

          <div className="p-4 rounded-2xl glass-card border border-purple-500/20 text-center">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Imposter Word</p>
            <p className="text-lg font-black text-neon-gold mt-1 truncate">
              {roomState.imposterWord || '???'}
            </p>
          </div>
        </div>

        {/* Voting Breakdown Table */}
        {roomState.voteCounts && (
          <div className="mt-4 pt-4 border-t border-purple-500/20">
            <p className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-3">
              Voting Tally Results
            </p>
            <div className="space-y-2">
              {roomState.players.map((p) => {
                const votes = roomState.voteCounts?.[p.id] || 0;
                const wasEliminated = roomState.eliminatedPlayer?.id === p.id;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-xl border text-sm font-semibold ${
                      wasEliminated
                        ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                        : 'glass-card border-purple-500/15 text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{p.name}</span>
                      {wasEliminated && (
                        <span className="text-[10px] bg-rose-600/40 text-rose-300 font-bold px-1.5 py-0.5 rounded">
                          ELIMINATED
                        </span>
                      )}
                    </div>
                    <span className="font-extrabold text-neon-cyan">{votes} {votes === 1 ? 'Vote' : 'Votes'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Host / Player Controls */}
      <div className="space-y-3">
        {isHost ? (
          <button
            onClick={onPlayAgain}
            className="w-full py-4 px-6 rounded-2xl neon-btn-primary font-black text-lg text-white flex items-center justify-center gap-2 shadow-xl"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Play Again</span>
          </button>
        ) : (
          <div className="p-4 rounded-2xl glass-card border border-purple-500/20 text-center text-sm font-semibold text-purple-200 flex items-center justify-center gap-2">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>Waiting for room host to start another round...</span>
          </div>
        )}

        <button
          onClick={onLeaveRoom}
          className="w-full py-3.5 px-6 rounded-2xl glass-card hover:bg-purple-800/30 border border-purple-500/30 text-gray-300 hover:text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Return to Home</span>
        </button>
      </div>
    </div>
  );
};
