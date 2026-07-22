import React, { useState, useEffect } from 'react';
import { Send, Clock, AlertTriangle, HelpCircle, Check, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoomPublicState, PersonalRolePayload } from '../types/game';
import { Timer } from './Timer';
import { SecretWordCard } from './SecretWordCard';
import { sound } from '../services/sound';

interface RoundCluePhaseProps {
  roomState: RoomPublicState;
  rolePayload: PersonalRolePayload | null;
  myId?: string;
  onSubmitClue: (clue: string) => Promise<boolean>;
}

export const RoundCluePhase: React.FC<RoundCluePhaseProps> = ({
  roomState,
  rolePayload,
  myId,
  onSubmitClue,
}) => {
  const [clueInput, setClueInput] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const me = roomState.players.find((p) => p.id === myId);
  const isMyTurn = myId === roomState.activeWriterId;
  const activeWriter = roomState.players.find((p) => p.id === roomState.activeWriterId);
  
  // Clues submitted so far in this round
  const currentRoundClues = roomState.clues.filter((c) => c.round === roomState.currentRound);

  // Clear input once turn changes
  useEffect(() => {
    if (!isMyTurn) {
      setClueInput('');
      setValidationError(null);
    }
  }, [isMyTurn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMyTurn || isSubmitting) return;

    sound.playClick();
    const trimmed = clueInput.trim();
    if (!trimmed) {
      setValidationError('Please enter your clue!');
      return;
    }

    // Validation matching backend regex: exactly 1 word, letters only, no spaces/emojis/numbers/special chars, max 20 letters
    if (!/^[a-zA-Z]{1,20}$/.test(trimmed)) {
      setValidationError('Clue must be exactly ONE word with letters only (no numbers, spaces, emojis, or symbols. Max 20 letters).');
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);
    const success = await onSubmitClue(trimmed);
    setIsSubmitting(false);
    if (success) {
      setClueInput('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6"
    >
      {/* Round Header */}
      <div className="text-center">
        <span className="px-4 py-1.5 rounded-full bg-purple-900/60 border border-purple-500/30 text-neon-cyan font-extrabold text-xs tracking-widest uppercase shadow-md">
          ROUND {roomState.currentRound} OF 2
        </span>
        <h2 className="text-2xl font-black text-white mt-2">Submit Clues Sequentially</h2>
        <p className="text-xs text-purple-200/70 mt-1">
          Take turns entering exactly ONE word to describe your secret card.
        </p>
      </div>

      {/* Turn Queue Timeline */}
      <div className="glass-panel p-4 rounded-2xl border border-purple-500/15">
        <p className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-2.5">
          Submission Order Queue
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {roomState.clueOrder.map((pid, idx) => {
            const player = roomState.players.find((p) => p.id === pid);
            if (!player) return null;

            const isWriter = pid === roomState.activeWriterId;
            const alreadySubmitted = roomState.clues.some(
              (c) => c.playerId === pid && c.round === roomState.currentRound
            );

            return (
              <React.Fragment key={pid}>
                {idx > 0 && <span className="text-purple-600/40 text-xs font-bold">→</span>}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all ${
                    isWriter
                      ? 'bg-neon-cyan/20 border-neon-cyan text-white shadow-[0_0_10px_rgba(0,245,212,0.15)] animate-pulse'
                      : alreadySubmitted
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-450'
                      : 'bg-dark-900/50 border-purple-500/10 text-gray-500'
                  }`}
                >
                  <span>{player.name}</span>
                  {alreadySubmitted && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  {isWriter && <Clock className="w-3 h-3 text-neon-cyan animate-spin-slow" />}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Secret Word Card */}
      <SecretWordCard rolePayload={rolePayload} />

      {/* Timer Display */}
      <Timer
        seconds={roomState.timerSeconds}
        totalSeconds={roomState.settings.roundTimer}
        label={isMyTurn ? 'Your Turn Remaining' : `${activeWriter?.name || 'Active Player'}'s Turn`}
      />

      {/* Clue Input Form / Wait Box */}
      <div className="glass-panel rounded-3xl p-6 border border-purple-500/20 shadow-xl">
        <AnimatePresence mode="wait">
          {isMyTurn ? (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-purple-300 mb-2 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-neon-cyan" /> It's Your Turn! Enter Your Clue Word
                </label>
                <input
                  type="text"
                  value={clueInput}
                  onChange={(e) => {
                    setClueInput(e.target.value);
                    setValidationError(null);
                  }}
                  disabled={isSubmitting}
                  placeholder="Letters only, no spaces"
                  maxLength={20}
                  className="w-full px-4 py-3.5 rounded-xl glass-input text-center text-xl font-bold placeholder:text-gray-500 placeholder:text-sm"
                  autoFocus
                />
                <AnimatePresence>
                  {validationError && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs font-semibold text-rose-400 mt-2 flex items-center justify-center gap-1 leading-relaxed overflow-hidden"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {validationError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting || !clueInput.trim()}
                className="w-full py-3.5 px-6 rounded-xl neon-btn-primary font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
              >
                <Send className="w-4 h-4" />
                <span>Submit Clue</span>
              </motion.button>
            </motion.form>
          ) : (
            <motion.div
              key="wait"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center py-6"
            >
              <Clock className="w-12 h-12 text-neon-cyan mx-auto mb-3 animate-spin-slow" />
              <h3 className="text-lg font-bold text-white mb-1">Waiting for turn...</h3>
              <p className="text-xs text-purple-300">
                It is currently <strong className="text-neon-cyan">{activeWriter?.name || 'someone else'}</strong>'s turn to submit their clue word.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Clues Submitted So Far Log */}
      {currentRoundClues.length > 0 && (
        <div className="glass-panel rounded-3xl p-5 border border-purple-500/20 shadow-xl">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-500/15">
            <Eye className="w-4 h-4 text-neon-cyan" />
            <span className="text-xs font-black uppercase tracking-wider text-purple-300">
              Submitted Clues (Round {roomState.currentRound})
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-purple-500/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-purple-950/80 text-purple-300 text-[10px] font-bold uppercase tracking-wider border-b border-purple-500/15">
                  <th className="py-2.5 px-3">Player</th>
                  <th className="py-2.5 px-3 text-right">Clue Word</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10 text-xs">
                {currentRoundClues.map((item) => {
                  const isUserClue = item.playerId === myId;
                  return (
                    <tr key={item.playerId} className={isUserClue ? 'bg-purple-900/20 font-bold' : ''}>
                      <td className="py-2.5 px-3 font-semibold text-white">
                        {item.playerName} {isUserClue && <span className="text-[9px] text-neon-blue">(YOU)</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-neon-cyan text-sm tracking-wide">
                        {item.clue || <span className="text-rose-500/60 font-semibold italic">Timed Out</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
};
