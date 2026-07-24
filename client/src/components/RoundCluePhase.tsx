import React, { useState } from 'react';
import { Send, Clock, AlertTriangle, HelpCircle, Check, Edit3 } from 'lucide-react';
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

  const clueOrder = roomState.clueOrder || [];
  let orderIds = clueOrder.filter((id) => connectedPlayers.some((p) => p.id === id));
  connectedPlayers.forEach((p) => {
    if (!orderIds.includes(p.id)) orderIds.push(p.id);
  });
  if (orderIds.length === 0) orderIds = connectedPlayers.map((p) => p.id);

  // Rotate starting player by 1 position each round
  const offset = (roomState.currentRound - 1) % (orderIds.length || 1);
  const roundTurnOrderIds = [...orderIds.slice(offset), ...orderIds.slice(0, offset)];

  const turnOrderedPlayers = roundTurnOrderIds
    .map((id) => connectedPlayers.find((p) => p.id === id))
    .filter((p): p is typeof connectedPlayers[0] => !!p);

  const activeWriter = connectedPlayers.find((p) => p.id === roomState.activeWriterId);
  const isMyTurn = roomState.activeWriterId === myId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMyTurn || hasSubmitted || isSubmitting) return;

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
          ROUND {roomState.currentRound} • TURN-BY-TURN
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">Submit Your Clue</h2>
        <p className="text-xs text-purple-200/70 mt-1">
          Players enter clues one by one in turn order. Enter exactly ONE word for your secret card.
        </p>
      </div>

      {/* Secret Word Card */}
      <SecretWordCard rolePayload={rolePayload} />

      {/* Current Turn Banner */}
      <div className="glass-panel p-4 rounded-2xl border border-purple-500/30 text-center shadow-lg">
        {isMyTurn ? (
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="flex items-center justify-center gap-2 text-emerald-400 font-black text-base sm:text-lg uppercase tracking-wider"
          >
            <Edit3 className="w-5 h-5 animate-bounce" />
            <span>It's Your Turn to Enter a Clue!</span>
          </motion.div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-purple-200 font-semibold text-sm">
            <Clock className="w-4 h-4 text-neon-cyan animate-pulse" />
            <span>
              Waiting for <strong className="text-neon-cyan font-bold">{activeWriter?.name || 'next player'}</strong> to enter clue...
            </span>
          </div>
        )}
      </div>

      {/* Submission Status Queue in Turn Order */}
      <div className="glass-panel p-4 rounded-2xl border border-purple-500/15">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">
            Turn Order for Round {roomState.currentRound}
          </p>
          <span className="text-xs font-extrabold text-neon-cyan bg-purple-900/40 px-2 py-0.5 rounded-full border border-purple-500/20">
            {submittedCount} / {connectedPlayers.length} Done
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {turnOrderedPlayers.map((player, index) => {
            const isUserSubmitted = player.hasSubmittedClue;
            const isActiveTurn = player.id === roomState.activeWriterId;

            return (
              <div
                key={player.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  isUserSubmitted
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                    : isActiveTurn
                    ? 'bg-purple-900/80 border-neon-cyan text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] animate-pulse'
                    : 'bg-dark-900/60 border-purple-500/20 text-purple-200/60'
                }`}
              >
                <span className="text-[10px] text-purple-400 font-mono font-bold">#{index + 1}</span>
                <span>{player.name}</span>
                {player.id === myId && <span className="text-[9px] text-neon-cyan">(You)</span>}
                {isUserSubmitted ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : isActiveTurn ? (
                  <Edit3 className="w-3.5 h-3.5 text-neon-cyan animate-spin-slow" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-purple-400/50" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Clue Input Form / Wait Box */}
      <div className="glass-panel rounded-3xl p-6 border border-purple-500/20 shadow-xl">
        <AnimatePresence mode="wait">
          {isMyTurn && !hasSubmitted ? (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neon-cyan mb-2 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-neon-cyan" /> Enter Your Clue Word (Your Turn)
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
                  className="w-full px-4 py-3.5 rounded-xl glass-input text-center text-xl font-bold placeholder:text-gray-500 placeholder:text-sm focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
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
          ) : hasSubmitted ? (
            <motion.div
              key="submitted"
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
                Waiting for remaining turns to finish...
              </p>
              <p className="text-xs text-purple-400/80 mt-2">
                The decision screen will automatically appear once all players have submitted their clues.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="waiting-turn"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center py-6"
            >
              <div className="w-14 h-14 rounded-2xl bg-purple-900/40 text-purple-300 border border-purple-500/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Clock className="w-7 h-7 text-neon-cyan animate-pulse" />
              </div>
              <h3 className="text-lg font-black text-white mb-1">
                Waiting for {activeWriter?.name || 'next player'}
              </h3>
              <p className="text-xs font-semibold text-purple-300">
                It will be your turn soon! Get your clue word ready.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
