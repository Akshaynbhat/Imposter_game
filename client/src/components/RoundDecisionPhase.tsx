import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Search, CheckCircle2, Users, HelpCircle } from 'lucide-react';
import { RoomPublicState, DecisionOption } from '../types/game';
import { sound } from '../services/sound';

interface RoundDecisionPhaseProps {
  roomState: RoomPublicState;
  myId?: string;
  onSubmitDecision: (decision: DecisionOption) => Promise<boolean>;
}

export const RoundDecisionPhase: React.FC<RoundDecisionPhaseProps> = ({
  roomState,
  myId,
  onSubmitDecision,
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const me = roomState.players.find((p) => p.id === myId);
  const myChoice = me?.decisionVote;
  const hasVoted = !!myChoice;

  const connectedPlayers = roomState.players.filter((p) => p.isConnected);
  const totalVotesCast = connectedPlayers.filter((p) => p.decisionVote).length;

  const playAgainCount = roomState.decisionVotesCount?.PLAY_AGAIN || 0;
  const guessImposterCount = roomState.decisionVotesCount?.GUESS_IMPOSTER || 0;

  const handleVote = async (choice: DecisionOption) => {
    if (hasVoted || isSubmitting) return;

    sound.playClick();
    setIsSubmitting(true);
    await onSubmitDecision(choice);
    setIsSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="w-full max-w-xl mx-auto px-4 py-6 space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <span className="px-4 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-neon-cyan font-extrabold text-xs tracking-widest uppercase shadow-md">
          ROUND {roomState.currentRound} DECISION
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-white mt-2 flex items-center justify-center gap-2">
          <HelpCircle className="w-7 h-7 text-neon-cyan" />
          <span>What would you like to do?</span>
        </h2>
        <p className="text-xs text-purple-200/80 mt-1">
          Vote with your crew to continue giving clues or guess the imposter!
        </p>
      </div>

      {/* Vote Progress Banner */}
      <div className="glass-panel p-4 rounded-2xl border border-purple-500/20 text-center">
        <div className="flex items-center justify-between text-xs font-bold text-purple-300 mb-2">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4 text-neon-cyan" /> Decision Progress
          </span>
          <span className="text-neon-cyan bg-purple-900/60 px-2 py-0.5 rounded-full border border-purple-500/20">
            {totalVotesCast} / {connectedPlayers.length} Voted
          </span>
        </div>

        <div className="w-full bg-dark-900 h-2 rounded-full overflow-hidden border border-purple-500/20">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(totalVotesCast / connectedPlayers.length) * 100}%` }}
            className="h-full bg-gradient-to-r from-purple-500 to-neon-cyan"
          />
        </div>
      </div>

      {/* Decision Buttons */}
      <div className="space-y-4">
        {/* Option 1: Play One More Round */}
        <motion.button
          whileHover={!hasVoted ? { scale: 1.02 } : {}}
          whileTap={!hasVoted ? { scale: 0.98 } : {}}
          onClick={() => handleVote('PLAY_AGAIN')}
          disabled={hasVoted || isSubmitting}
          className={`w-full p-5 rounded-3xl border transition-all text-left flex items-center justify-between shadow-xl ${
            myChoice === 'PLAY_AGAIN'
              ? 'bg-gradient-to-r from-indigo-900/90 via-purple-900/90 to-indigo-900/90 border-neon-cyan shadow-[0_0_30px_rgba(0,245,212,0.3)] ring-2 ring-neon-cyan/50'
              : hasVoted
              ? 'opacity-40 glass-card border-purple-500/10 cursor-not-allowed'
              : 'glass-card border-purple-500/30 hover:border-purple-500/70 hover:bg-purple-900/30 cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${
              myChoice === 'PLAY_AGAIN' ? 'bg-neon-cyan text-dark-950 font-black' : 'bg-purple-800'
            }`}>
              <Play className="w-7 h-7 fill-current" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>▶ Play One More Round</span>
                {myChoice === 'PLAY_AGAIN' && <span className="text-xs bg-neon-cyan/20 text-neon-cyan px-2 py-0.5 rounded-full font-bold">YOUR VOTE</span>}
              </h3>
              <p className="text-xs text-purple-200/70 mt-0.5">
                Keep exact same secret words and submit another clue.
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xl font-black text-neon-cyan">{playAgainCount}</span>
            <p className="text-[10px] text-purple-300 font-bold uppercase">Votes</p>
          </div>
        </motion.button>

        {/* Option 2: Guess the Imposter */}
        <motion.button
          whileHover={!hasVoted ? { scale: 1.02 } : {}}
          whileTap={!hasVoted ? { scale: 0.98 } : {}}
          onClick={() => handleVote('GUESS_IMPOSTER')}
          disabled={hasVoted || isSubmitting}
          className={`w-full p-5 rounded-3xl border transition-all text-left flex items-center justify-between shadow-xl ${
            myChoice === 'GUESS_IMPOSTER'
              ? 'bg-gradient-to-r from-rose-950/90 via-purple-900/90 to-rose-950/90 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.4)] ring-2 ring-rose-500/50'
              : hasVoted
              ? 'opacity-40 glass-card border-purple-500/10 cursor-not-allowed'
              : 'glass-card border-purple-500/30 hover:border-purple-500/70 hover:bg-purple-900/30 cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${
              myChoice === 'GUESS_IMPOSTER' ? 'bg-rose-600 font-black' : 'bg-purple-800'
            }`}>
              <Search className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>🕵 Guess the Imposter</span>
                {myChoice === 'GUESS_IMPOSTER' && <span className="text-xs bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-bold">YOUR VOTE</span>}
              </h3>
              <p className="text-xs text-purple-200/70 mt-0.5">
                End clue rounds and proceed directly to voting.
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xl font-black text-rose-400">{guessImposterCount}</span>
            <p className="text-[10px] text-purple-300 font-bold uppercase">Votes</p>
          </div>
        </motion.button>
      </div>

      {/* Post-Vote Confirmation */}
      {hasVoted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-4 rounded-2xl border border-purple-500/20 text-center space-y-1"
        >
          <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Vote Recorded!</span>
          </div>
          <p className="text-xs text-purple-300 font-medium">
            Waiting for other players to make their decision...
          </p>
        </motion.div>
      )}

      {/* Connected Players Status Badges */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        {connectedPlayers.map((p) => (
          <span
            key={p.id}
            className={`text-[11px] font-bold px-3 py-1 rounded-xl border flex items-center gap-1.5 ${
              p.decisionVote
                ? 'bg-purple-950/80 border-purple-500/40 text-purple-200'
                : 'bg-dark-900/60 border-purple-500/15 text-purple-400/50'
            }`}
          >
            <span>{p.name}</span>
            {p.decisionVote ? (
              <span className="text-[9px] bg-purple-900 px-1.5 py-0.5 rounded font-extrabold text-neon-cyan">
                {p.decisionVote === 'PLAY_AGAIN' ? '▶ Round' : '🕵 Guess'}
              </span>
            ) : (
              <span className="text-[9px] italic">Voting...</span>
            )}
          </span>
        ))}
      </div>
    </motion.div>
  );
};
