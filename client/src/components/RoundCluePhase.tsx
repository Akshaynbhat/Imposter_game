import React, { useState } from 'react';
import { Send, Clock, AlertTriangle, HelpCircle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoomPublicState, PersonalRolePayload } from '../types/game';
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
  const hasSubmitted = me?.hasSubmittedClue ?? false;
  
  const connectedPlayers = roomState.players.filter((p) => p.isConnected);
  const submittedCount = connectedPlayers.filter((p) => p.hasSubmittedClue).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasSubmitted || isSubmitting) return;

    sound.playClick();
    const trimmed = clueInput.trim();
    if (!trimmed) {
      setValidationError('Please enter your clue!');
      return;
    }

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
          ROUND {roomState.currentRound}
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">Submit Your Clue</h2>
        <p className="text-xs text-purple-200/70 mt-1">
          Take your time to think! Enter exactly ONE word to describe your secret card.
        </p>
      </div>

      {/* Secret Word Card */}
      <SecretWordCard rolePayload={rolePayload} />

      {/* Submission Status Queue */}
      <div className="glass-panel p-4 rounded-2xl border border-purple-500/15">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">
            Player Submissions
          </p>
          <span className="text-xs font-extrabold text-neon-cyan bg-purple-900/40 px-2 py-0.5 rounded-full border border-purple-500/20">
            {submittedCount} / {connectedPlayers.length} Ready
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {connectedPlayers.map((player) => {
            const isUserSubmitted = player.hasSubmittedClue;

            return (
              <div
                key={player.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  isUserSubmitted
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                    : 'bg-dark-900/60 border-purple-500/20 text-purple-200/70'
                }`}
              >
                <span>{player.name}</span>
                {player.id === myId && <span className="text-[9px] text-neon-cyan">(You)</span>}
                {isUserSubmitted ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Clue Input Form / Wait Box */}
      <div className="glass-panel rounded-3xl p-6 border border-purple-500/20 shadow-xl">
        <AnimatePresence mode="wait">
          {!hasSubmitted ? (
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
                  <HelpCircle className="w-3.5 h-3.5 text-neon-cyan" /> Enter Your Clue Word
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
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white mb-1">Clue Submitted!</h3>
              <p className="text-sm font-semibold text-purple-300">
                Waiting for other players...
              </p>
              <p className="text-xs text-purple-400/80 mt-2">
                The decision screen will automatically appear once all players have submitted their clues.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
