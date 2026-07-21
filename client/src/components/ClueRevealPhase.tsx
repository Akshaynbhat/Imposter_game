import React from 'react';
import { Eye, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { RoomPublicState } from '../types/game';

interface ClueRevealPhaseProps {
  roomState: RoomPublicState;
  myId?: string;
}

export const ClueRevealPhase: React.FC<ClueRevealPhaseProps> = ({ roomState, myId }) => {
  const currentRoundClues = roomState.clues.filter((c) => c.round === roomState.currentRound);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full max-w-xl mx-auto px-4 py-8"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <span className="px-4 py-1.5 rounded-full bg-purple-900/60 border border-purple-500/30 text-neon-cyan font-extrabold text-xs tracking-widest uppercase">
          ROUND {roomState.currentRound} CLUES REVEALED
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-white mt-2 flex items-center justify-center gap-2">
          <Eye className="w-6 h-6 text-neon-blue animate-pulse" />
          <span>Submitted Clues</span>
        </h2>
      </div>

      {/* Clues Table Card */}
      <div className="glass-panel rounded-3xl p-6 border border-purple-500/20 shadow-xl mb-6">
        <div className="overflow-hidden rounded-2xl border border-purple-500/15">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-purple-950/80 text-purple-300 text-xs font-bold uppercase tracking-wider border-b border-purple-500/20">
                <th className="py-3.5 px-4">Player</th>
                <th className="py-3.5 px-4 text-right">Clue Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10 text-sm">
              {currentRoundClues.map((item, idx) => {
                const isMe = item.playerId === myId;
                return (
                  <motion.tr
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={item.playerId}
                    className={`transition-colors ${
                      isMe ? 'bg-purple-900/30 font-bold' : 'hover:bg-purple-900/10'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                      <span>{item.playerName}</span>
                      {isMe && (
                        <span className="text-[10px] bg-neon-blue/20 text-neon-blue font-bold px-1.5 py-0.5 rounded">
                          YOU
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-neon-cyan text-base tracking-wide">
                      {item.clue || <span className="text-rose-500/60 font-semibold italic">Timed Out</span>}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Next Phase Countdown Banner */}
      <div className="glass-card rounded-2xl p-4 text-center border border-purple-500/30 flex items-center justify-center gap-3 shadow-md">
        <Sparkles className="w-5 h-5 text-neon-gold animate-spin-slow" />
        <p className="text-sm font-semibold text-purple-200">
          Discussion round starts in{' '}
          <span className="text-neon-cyan font-black text-lg">{roomState.timerSeconds}</span> seconds...
        </p>
      </div>
    </motion.div>
  );
};
