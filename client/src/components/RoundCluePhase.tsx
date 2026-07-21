import React, { useState } from 'react';
import { Send, Clock, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
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
  const hasSubmitted = me?.hasSubmittedClue ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasSubmitted || isSubmitting) return;

    sound.playClick();
    const trimmed = clueInput.trim();
    if (!trimmed) {
      setValidationError('Please enter your clue!');
      return;
    }

    // Validation matching backend regex: exactly 1 word, letters only, no spaces/emojis/numbers/special chars, max 20 letters
    if (!/^[a-zA-Z]{1,20}$/.test(trimmed)) {
      setValidationError('Must be exactly ONE word with letters only (no numbers, spaces, emojis, or symbols. Max 20 letters).');
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);
    await onSubmitClue(trimmed);
    setIsSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="w-full max-w-lg mx-auto px-4 py-6"
    >
      {/* Round Header */}
      <div className="text-center mb-4">
        <span className="px-4 py-1.5 rounded-full bg-purple-900/60 border border-purple-500/30 text-neon-cyan font-extrabold text-xs tracking-widest uppercase shadow-md">
          ROUND {roomState.currentRound} OF 2
        </span>
        <h2 className="text-2xl font-black text-white mt-2">Enter Your Clue</h2>
        <p className="text-xs text-purple-200/70 mt-1">
          Provide exactly ONE word to describe your secret role card.
        </p>
      </div>

      {/* Secret Word Card */}
      <SecretWordCard rolePayload={rolePayload} />

      {/* Timer Display */}
      <Timer seconds={roomState.timerSeconds} totalSeconds={roomState.settings.roundTimer} label="Time to Submit Clue" />

      {/* Clue Input Form / Submission Lock State */}
      <div className="glass-panel rounded-3xl p-6 border border-purple-500/20 shadow-xl mt-4">
        <AnimatePresence mode="wait">
          {hasSubmitted ? (
            <motion.div 
              key="submitted"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-6"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 animate-bounce" />
              <h3 className="text-lg font-bold text-white mb-1">Clue Locked In</h3>
              <p className="text-xs text-purple-300 flex items-center justify-center gap-1.5">
                <Clock className="w-4 h-4 animate-spin-slow text-neon-cyan" />
                Waiting for the rest of the crew to submit clues...
              </p>
            </motion.div>
          ) : (
            <motion.form 
              key="form"
              onSubmit={handleSubmit} 
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-purple-300 mb-2 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-neon-cyan" /> Your Clue Word
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
                />
                <AnimatePresence>
                  {validationError && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
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
                <span>Lock Clue</span>
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
