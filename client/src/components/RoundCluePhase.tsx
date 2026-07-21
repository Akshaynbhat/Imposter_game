import React, { useState } from 'react';
import { Send, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { RoomPublicState, PersonalRolePayload } from '../types/game';
import { Timer } from './Timer';
import { SecretWordCard } from './SecretWordCard';

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

    const trimmed = clueInput.trim();
    if (!trimmed) {
      setValidationError('Please enter a single-word clue!');
      return;
    }

    if (trimmed.includes(' ') || trimmed.includes('\t') || trimmed.includes('\n')) {
      setValidationError('Maximum 1 word allowed! No spaces permitted.');
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);
    await onSubmitClue(trimmed);
    setIsSubmitting(false);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6">
      {/* Round Header */}
      <div className="text-center mb-4">
        <span className="px-4 py-1.5 rounded-full bg-purple-900/60 border border-purple-500/30 text-neon-cyan font-extrabold text-xs tracking-widest uppercase shadow-md">
          ROUND {roomState.currentRound} OF 2
        </span>
        <h2 className="text-2xl font-black text-white mt-2">Submit Your Secret Clue</h2>
        <p className="text-xs text-purple-200/70 mt-1">
          Give 1 subtle word related to your secret word. Do not make it too obvious!
        </p>
      </div>

      {/* Secret Word Card */}
      <SecretWordCard rolePayload={rolePayload} />

      {/* Timer Display */}
      <Timer seconds={roomState.timerSeconds} totalSeconds={15} label="Time to Submit Clue" />

      {/* Clue Input Form / Submission Lock State */}
      <div className="glass-panel rounded-3xl p-6 border border-purple-500/20 shadow-xl mt-4">
        {hasSubmitted ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 animate-bounce" />
            <h3 className="text-lg font-bold text-white mb-1">Clue Submitted!</h3>
            <p className="text-xs text-purple-300 flex items-center justify-center gap-1.5">
              <Clock className="w-4 h-4 animate-spin-slow text-neon-cyan" />
              Waiting for other players to submit their clues...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-purple-300 mb-2">
                Your Single-Word Clue
              </label>
              <input
                type="text"
                value={clueInput}
                onChange={(e) => {
                  setClueInput(e.target.value);
                  setValidationError(null);
                }}
                disabled={isSubmitting}
                placeholder="Enter ONE clue (e.g. Sweet, Red, Fast)"
                maxLength={20}
                className="w-full px-4 py-3.5 rounded-xl glass-input text-center text-xl font-bold placeholder:text-gray-500 placeholder:text-sm"
              />
              {validationError && (
                <p className="text-xs font-semibold text-rose-400 mt-2 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {validationError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !clueInput.trim()}
              className="w-full py-3.5 px-6 rounded-xl neon-btn-primary font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            >
              <Send className="w-4 h-4" />
              <span>Submit Clue</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
