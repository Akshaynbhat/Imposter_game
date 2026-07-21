import React, { useState } from 'react';
import { Vote, CheckCircle2, AlertCircle } from 'lucide-react';
import { RoomPublicState } from '../types/game';
import { Timer } from './Timer';

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

  const handleVoteSubmit = async () => {
    if (!selectedTargetId || hasVoted || isSubmitting) return;

    if (selectedTargetId === myId) {
      setErrorMsg('You cannot vote for yourself!');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    await onVote(selectedTargetId);
    setIsSubmitting(false);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-4">
        <span className="px-4 py-1.5 rounded-full bg-rose-950/70 border border-rose-500/30 text-rose-300 font-extrabold text-xs tracking-widest uppercase shadow-md">
          VOTING PHASE
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">Who is the Imposter?</h2>
        <p className="text-xs text-purple-200/70 mt-1">
          Review the clues below and cast your vote before time runs out.
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
          <h3 className="text-lg font-bold text-white mb-1">Your Vote Has Been Recorded!</h3>
          <p className="text-xs text-purple-300">
            Waiting for other players to submit their votes...
          </p>
        </div>
      ) : (
        /* Player Selection Cards */
        <div className="space-y-3 my-4">
          {roomState.players.map((player) => {
            const isMe = player.id === myId;
            const isSelected = selectedTargetId === player.id;

            // Gather clues for this player
            const r1Clue = roomState.clues.find((c) => c.playerId === player.id && c.round === 1)?.clue;
            const r2Clue = roomState.clues.find((c) => c.playerId === player.id && c.round === 2)?.clue;

            return (
              <div
                key={player.id}
                onClick={() => {
                  if (!isMe) {
                    setSelectedTargetId(player.id);
                    setErrorMsg(null);
                  }
                }}
                className={`p-4 rounded-2xl border transition-all ${
                  isMe
                    ? 'opacity-50 cursor-not-allowed bg-purple-950/20 border-purple-500/10'
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
                        {isMe && <span className="text-[10px] text-gray-400 font-normal">(Cannot vote yourself)</span>}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-purple-200 mt-1">
                        <span>R1 Clue: <strong className="text-neon-cyan">{r1Clue || '-'}</strong></span>
                        <span>•</span>
                        <span>R2 Clue: <strong className="text-neon-cyan">{r2Clue || '-'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {!isMe && (
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
              </div>
            );
          })}

          <button
            onClick={handleVoteSubmit}
            disabled={!selectedTargetId || isSubmitting}
            className="w-full mt-4 py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-purple-600 font-extrabold text-lg text-white shadow-xl hover:shadow-rose-600/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Vote className="w-5 h-5" />
            <span>Confirm Vote</span>
          </button>
        </div>
      )}
    </div>
  );
};
