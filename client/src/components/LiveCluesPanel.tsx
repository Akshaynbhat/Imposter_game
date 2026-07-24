import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Clock, Edit3 } from 'lucide-react';
import { RoomPublicState } from '../types/game';

interface LiveCluesPanelProps {
  roomState: RoomPublicState;
  myId?: string;
  className?: string;
}

export const LiveCluesPanel: React.FC<LiveCluesPanelProps> = ({ roomState, myId, className = '' }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const connectedPlayers = roomState.players.filter((p) => p.isConnected);
  const currentRound = roomState.currentRound || 1;

  // Generate rounds list up to currentRound
  const roundNumbers = Array.from({ length: currentRound }, (_, i) => i + 1);

  // Auto scroll to bottom when new clues are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [roomState.clues.length, currentRound]);

  return (
    <div className={`glass-panel rounded-3xl p-5 border border-purple-500/20 shadow-2xl flex flex-col h-full max-h-[550px] overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-purple-500/20 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/30 flex items-center justify-center text-neon-cyan">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-wide uppercase">📝 Live Clues</h3>
            <p className="text-[10px] text-purple-300 font-semibold">Updated in Real-Time</p>
          </div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider bg-purple-950/80 px-2.5 py-1 rounded-full border border-purple-500/30 text-neon-cyan">
          Round {currentRound}
        </span>
      </div>

      {/* Clues Content List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1 scroll-smooth">
        {roundNumbers.map((rNum) => {
          const roundClues = roomState.clues.filter((c) => c.round === rNum);
          const isCurrentRound = rNum === currentRound;

          const clueOrder = roomState.clueOrder || [];
          let orderIds = clueOrder.filter((id) => connectedPlayers.some((p) => p.id === id));
          connectedPlayers.forEach((p) => {
            if (!orderIds.includes(p.id)) orderIds.push(p.id);
          });
          if (orderIds.length === 0) orderIds = connectedPlayers.map((p) => p.id);

          const offset = (rNum - 1) % (orderIds.length || 1);
          const roundTurnOrderIds = [...orderIds.slice(offset), ...orderIds.slice(0, offset)];

          const roundOrderedPlayers = roundTurnOrderIds
            .map((id) => connectedPlayers.find((p) => p.id === id))
            .filter((p): p is typeof connectedPlayers[0] => !!p);

          return (
            <div key={rNum} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-300/80 px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-500/20">
                  Round {rNum}
                </span>
                <div className="flex-1 h-[1px] bg-purple-500/15" />
              </div>

              <div className="space-y-1.5">
                {roundOrderedPlayers.map((player) => {
                  const clueObj = roundClues.find((c) => c.playerId === player.id);
                  const isMe = player.id === myId;
                  const hasSubmitted = !!clueObj;
                  const isActiveWriter = isCurrentRound && player.id === roomState.activeWriterId;

                  return (
                    <AnimatePresence mode="wait" key={`${rNum}-${player.id}`}>
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          hasSubmitted
                            ? 'bg-purple-950/50 border-purple-500/25 text-white shadow-sm'
                            : isActiveWriter
                            ? 'bg-purple-900/70 border-neon-cyan text-white shadow-[0_0_12px_rgba(6,182,212,0.3)] animate-pulse'
                            : isCurrentRound
                            ? 'bg-dark-900/40 border-purple-500/10 text-purple-300/60'
                            : 'opacity-30 border-transparent text-gray-500'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate max-w-[100px] text-purple-200">
                            {player.name}
                          </span>
                          {isMe && (
                            <span className="text-[9px] text-neon-blue font-bold">(You)</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-purple-400 text-[10px]">→</span>
                          {hasSubmitted ? (
                            <motion.span
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="font-black text-neon-cyan text-sm tracking-wide bg-purple-900/40 px-2 py-0.5 rounded-md border border-neon-cyan/20"
                            >
                              {clueObj.clue}
                            </motion.span>
                          ) : isActiveWriter ? (
                            <span className="text-[11px] text-neon-cyan flex items-center gap-1 font-bold font-sans">
                              <Edit3 className="w-3 h-3 text-neon-cyan animate-bounce" />
                              <span>Writing...</span>
                            </span>
                          ) : isCurrentRound ? (
                            <span className="text-[11px] text-purple-400/80 flex items-center gap-1 italic font-sans">
                              <Clock className="w-3 h-3 text-purple-400 animate-spin-slow" />
                              <span>Waiting...</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-500 italic">-</span>
                          )}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
