import React from 'react';
import { Mic, Eye, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { RoomPublicState } from '../types/game';
import { Timer } from './Timer';

interface DiscussionPhaseProps {
  roomState: RoomPublicState;
  myId?: string;
}

export const DiscussionPhase: React.FC<DiscussionPhaseProps> = ({ roomState, myId }) => {
  const currentRoundClues = roomState.clues.filter((c) => c.round === roomState.currentRound);
  const isFinalRound = roomState.currentRound === 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full max-w-2xl mx-auto px-4 py-6"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <span className="px-4 py-1.5 rounded-full bg-indigo-950/70 border border-indigo-500/30 text-neon-blue font-extrabold text-xs tracking-widest uppercase">
          DISCUSSION ROUND {roomState.currentRound}
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">Voice Discussion Active</h2>
        <p className="text-xs text-purple-200/70 mt-1">
          Unmute on Discord/Voice chat and debate these clues!
        </p>
      </div>

      {/* Pulsing Mic Graphic */}
      <div className="flex flex-col items-center justify-center my-6 relative">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-24 h-24 rounded-full bg-indigo-500/10 border border-indigo-500/20 blur-xl pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-indigo-400/40 relative z-10"
        >
          <Mic className="w-8 h-8 animate-pulse text-neon-cyan" />
        </motion.div>

        {/* Dynamic Glowing Timer */}
        <Timer seconds={roomState.timerSeconds} totalSeconds={roomState.settings.discussionTimer} label="Debate Time Remaining" />
      </div>

      {/* Clues Table Reference */}
      <div className="glass-panel rounded-3xl p-6 border border-purple-500/20 shadow-xl">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-purple-500/15">
          <Eye className="w-4 h-4 text-neon-cyan" />
          <span className="text-xs font-black uppercase tracking-wider text-purple-300">
            Round {roomState.currentRound} Submitted Clues
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-purple-500/10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-purple-950/80 text-purple-300 text-[10px] font-bold uppercase tracking-wider border-b border-purple-500/15">
                <th className="py-2.5 px-3">Player</th>
                <th className="py-2.5 px-3 text-right">Clue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10 text-xs">
              {currentRoundClues.map((item) => {
                const isMe = item.playerId === myId;
                return (
                  <tr
                    key={item.playerId}
                    className={isMe ? 'bg-purple-900/20 font-bold' : ''}
                  >
                    <td className="py-2.5 px-3 font-semibold text-white">
                      {item.playerName} {isMe && <span className="text-[9px] text-neon-blue">(YOU)</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-neon-cyan text-sm tracking-wide">
                      {item.clue || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
