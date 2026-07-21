import React, { useState } from 'react';
import { Vote, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoomPublicState } from '../types/game';
import { Timer } from './Timer';
import { sound } from '../services/sound';

interface VotingPhaseProps {
  roomState: RoomPublicState;
  myId?: string;
  onVote: (targetId: string) => Promise<boolean>;
}

export const VotingPhase: React.FC<VotingPhaseProps> = ({ roomState, myId, onVote }) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const me = roomState.players.find((p) => p.id === myId);
  const hasVoted = me?.hasVoted ?? false;
  const isTieBreak = roomState.phase === 'TIE_BREAK_VOTING';

  const handleVoteSubmit = async () => {
    if (!selectedTargetId || hasVoted || isSubmitting) return;

    sound.playClick();
    if (selectedTargetId === myId) {
      setErrorMsg('You cannot vote for yourself!');
      return;
    }

    if (isTieBreak && !roomState.tieBreakCandidates.includes(selectedTargetId)) {
      setErrorMsg('You must vote for one of the tied candidates!');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    await onVote(selectedTargetId);
    setIsSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="w-full max-w-xl mx-auto px-4 py-6"
    >
      {/* Header */}
      <div className="text-center mb-4">
        {isTieBreak ? (
          <span className="px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-extrabold text-xs tracking-widest uppercase shadow-md animate-pulse flex items-center justify-center gap-1.5 max-w-xs mx-auto">
            <AlertTriangle className="w-3.5 h-3.5" /> TIE BREAK VOTING
          </span>
        ) : (
          <span className="px-4 py-1.5 rounded-full bg-rose-950/70 border border-rose-500/30 text-rose-300 font-extrabold text-xs tracking-widest uppercase shadow-md">
            VOTING PHASE
          </span>
        )}
        <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
          {isTieBreak ? 'Break the Vote Tie!' : 'Who is the Imposter?'}
        </h2>
        <p className="text-xs text-purple-200/70 mt-1">
          {isTieBreak
            ? 'Vote ONLY for one of the tied players below.'
            : 'Select the player you suspect and confirm your vote.'}
        </p>
      </div>

      {/* Timer */}
      <Timer seconds={roomState.timerSeconds} totalSeconds={30} label="Voting Time Remaining" />

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
          <AlertCircle className="w-4 h-4" /> {errorMsg}
        </div>
      )}

      {/* Already Voted State */}
      {hasVoted ? (
        <div className="glass-panel rounded-3xl p-6 text-center border border-purple-500/20 shadow-xl mt-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 animate-bounce" />
          <h3 className="text-lg font-bold text-white mb-1">Vote Locked In</h3>
          <p className="text-xs text-purple-300">
            Waiting for other players to cast their votes...
          </p>
        </div>
      ) : (
        /* Player Selection Cards */
        <div className="space-y-3 my-4">
          {roomState.players.map((player) => {
            const isMe = player.id === myId;
            const isSelected = selectedTargetId === player.id;
            
            // In tie break, only allow selection of tie break candidates
            const isCandidate = !isTieBreak || roomState.tieBreakCandidates.includes(player.id);
            const canVoteFor = !isMe && isCandidate;

            // Clues reference
            const r1Clue = roomState.clues.find((c) => c.playerId === player.id && c.round === 1)?.clue;
            const r2Clue = roomState.clues.find((c) => c.playerId === player.id && c.round === 2)?.clue;

            return (
              <motion.div
                whileHover={canVoteFor ? { scale: 1.01 } : {}}
                key={player.id}
                onClick={() => {
                  if (canVoteFor) {
                    sound.playClick();
                    setSelectedTargetId(player.id);
                    setErrorMsg(null);
                  }
                }}
                className={`p-4 rounded-2xl border transition-all ${
                  isMe
                    ? 'opacity-40 cursor-not-allowed bg-purple-950/20 border-purple-500/10'
                    : !isCandidate
                    ? 'opacity-30 cursor-not-allowed bg-dark-900 border-purple-500/10'
                    : isSelected
                    ? 'bg-rose-950/40 border-rose-500/70 shadow-[0_0_20px_rgba(247,37,133,0.3)] cursor-pointer'
                    : 'glass-card border-purple-500/20 hover:border-purple-500/50 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white ${
                        isSelected ? 'bg-rose-600' : 'bg-purple-800'
                      }`}
                    >
                      {player.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm flex items-center gap-1.5">
                        <span>{player.name}</span>
                        {isMe && <span className="text-[10px] text-gray-400 font-normal">(You)</span>}
                        {isTieBreak && isCandidate && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 rounded font-bold">
                            Tied
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-purple-200 mt-1">
                        <span>R1 Clue: <strong className="text-neon-cyan">{r1Clue || '-'}</strong></span>
                        <span>•</span>
                        <span>R2 Clue: <strong className="text-neon-cyan">{r2Clue || '-'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {canVoteFor && (
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-rose-500 bg-rose-500 text-white'
                          : 'border-purple-400/50'
                      }`}
                    >
                      {isSelected && <Vote className="w-3.5 h-3.5" />}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleVoteSubmit}
            disabled={!selectedTargetId || isSubmitting}
            className="w-full mt-4 py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-purple-600 font-extrabold text-lg text-white shadow-xl hover:shadow-rose-600/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Vote className="w-5 h-5" />
            <span>Cast Ballot</span>
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};
