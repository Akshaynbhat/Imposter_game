import React from 'react';
import { Mic, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { RoomPublicState } from '../types/game';
import { Timer } from './Timer';
import { ChatBox } from './ChatBox';

interface DiscussionPhaseProps {
  roomState: RoomPublicState;
  myId?: string;
  onSendMessage: (message: string) => Promise<boolean>;
}

export const DiscussionPhase: React.FC<DiscussionPhaseProps> = ({ roomState, myId, onSendMessage }) => {
  const currentRoundClues = roomState.clues.filter((c) => c.round === roomState.currentRound);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full max-w-4xl mx-auto px-4 py-6"
    >
      {/* Header */}
      <div className="text-center mb-4">
        <span className="px-4 py-1.5 rounded-full bg-indigo-950/70 border border-indigo-500/30 text-neon-blue font-extrabold text-xs tracking-widest uppercase">
          DISCUSSION ROUND {roomState.currentRound}
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">Active Debate</h2>
        <p className="text-xs text-purple-200/70 mt-1">
          Use the in-game text chat below or unmute on Discord/Voice chat to discuss!
        </p>
      </div>

      {/* Pulsing Mic Graphic */}
      <div className="flex flex-col items-center justify-center my-4 relative">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-24 h-24 rounded-full bg-indigo-500/10 border border-indigo-500/20 blur-xl pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-indigo-400/40 relative z-10"
        >
          <Mic className="w-7 h-7 text-neon-cyan animate-pulse" />
        </motion.div>

        {/* Dynamic Glowing Timer */}
        <Timer seconds={roomState.timerSeconds} totalSeconds={roomState.settings.discussionTimer} label="Debate Time Remaining" />
      </div>

      {/* Grid: Clues reference (Col 1) and Chat Box (Col 2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Clues Panel */}
        <div className="glass-panel rounded-3xl p-5 border border-purple-500/20 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-500/15">
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
        </div>

        {/* Chat Box Panel */}
        <ChatBox 
          chatHistory={roomState.chatHistory || []} 
          myId={myId} 
          onSendMessage={onSendMessage} 
        />
      </div>
    </motion.div>
  );
};
