import React, { useState } from 'react';
import { Search, CheckCircle2, AlertCircle, AlertTriangle, User } from 'lucide-react';
import { motion } from 'framer-motion';
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
      {/* Social Deduction Header */}
      <div className="text-center mb-4">
        {isTieBreak ? (
          <span className="px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-extrabold text-xs tracking-widest uppercase shadow-md animate-pulse flex items-center justify-center gap-1.5 max-w-xs mx-auto mb-2">
            <AlertTriangle className="w-3.5 h-3.5" /> TIE BREAK VOTING
          </span>
        ) : null}
        
        <h2 className="text-3xl sm:text-4xl font-black text-white flex items-center justify-center gap-2">
          <span>🔍</span>
          <span>Guess the Imposter</span>
        </h2>

        <p className="text-sm font-semibold text-purple-200/80 mt-1.5">
          {isTieBreak
            ? 'Vote ONLY for one of the tied players below.'
            : 'Select the player you believe is the Imposter.'}
        </p>
      </div>

      {/* Timer */}
      <Timer seconds={roomState.timerSeconds} totalSeconds={30} label="Voting Time Remaining" />

      {errorMsg && (
        <div className="my-4 p-3.5 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5 border border-rose-500/30">
          <AlertCircle className="w-4 h-4" /> {errorMsg}
        </div>
      )}

      {/* Already Voted Confirmation Screen */}
      {hasVoted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel rounded-3xl p-8 text-center border border-purple-500/20 shadow-2xl mt-6 space-y-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.25)]">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>
          <h3 className="text-2xl font-black text-white">✅ Vote Submitted</h3>
          <p className="text-sm font-semibold text-purple-300">
            Waiting for other players...
          </p>
          <p className="text-xs text-purple-400/70 pt-2">
            Once everyone has guessed, the imposter will be revealed!
          </p>
        </motion.div>
      ) : (
        /* Poll Style Player Cards List */
        <div className="space-y-3 my-6">
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
                whileHover={canVoteFor ? { scale: 1.02 } : {}}
                whileTap={canVoteFor ? { scale: 0.98 } : {}}
                key={player.id}
                onClick={() => {
                  if (canVoteFor) {
                    sound.playClick();
                    setSelectedTargetId(player.id);
                    setErrorMsg(null);
                  }
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                  isMe
                    ? 'opacity-40 cursor-not-allowed bg-purple-950/20 border-purple-500/10'
                    : !isCandidate
                    ? 'opacity-30 cursor-not-allowed bg-dark-900 border-purple-500/10'
                    : isSelected
                    ? 'bg-rose-950/50 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.4)] ring-2 ring-rose-500/50'
                    : 'glass-card border-purple-500/20 hover:border-purple-500/60 hover:bg-purple-900/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Large Avatar */}
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-lg transition-all ${
                        isSelected
                          ? 'bg-gradient-to-tr from-rose-600 to-pink-500 shadow-rose-600/40'
                          : isMe
                          ? 'bg-purple-900/60 text-purple-400'
                          : 'bg-gradient-to-tr from-purple-800 to-indigo-700'
                      }`}
                    >
                      {player.name.substring(0, 2).toUpperCase()}
                    </div>

                    {/* Large Name & Clues */}
                    <div>
                      <h4 className="text-lg font-black text-white flex items-center gap-2">
                        <span>{player.name}</span>
                        {isMe && (
                          <span className="text-[10px] bg-purple-900/80 text-purple-300 font-semibold px-2 py-0.5 rounded-full border border-purple-500/30">
                            (Cannot vote yourself)
                          </span>
                        )}
                        {isTieBreak && isCandidate && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                            Tied Candidate
                          </span>
                        )}
                      </h4>

                      <div className="flex items-center gap-2 text-xs text-purple-200/80 mt-1 font-medium">
                        <span>Clues:</span>
                        <span className="bg-purple-950/60 px-2 py-0.5 rounded-md text-neon-cyan font-bold">
                          R1: {r1Clue || '-'}
                        </span>
                        <span className="bg-purple-950/60 px-2 py-0.5 rounded-md text-neon-cyan font-bold">
                          R2: {r2Clue || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Radio / Selection Indicator */}
                  {canVoteFor && (
                    <div
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-rose-500 bg-rose-500 text-white shadow-md shadow-rose-500/50'
                          : 'border-purple-400/40 bg-purple-950/40'
                      }`}
                    >
                      {isSelected && <Search className="w-4 h-4" />}
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
            className="w-full mt-6 py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 font-black text-lg text-white shadow-2xl hover:shadow-rose-600/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Search className="w-5 h-5" />
            <span>Guess the Imposter</span>
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};
