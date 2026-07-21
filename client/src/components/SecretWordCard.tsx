import React, { useState } from 'react';
import { Eye, EyeOff, Lock, UserCheck, Skull } from 'lucide-react';
import { PersonalRolePayload } from '../types/game';

interface SecretWordCardProps {
  rolePayload: PersonalRolePayload | null;
}

export const SecretWordCard: React.FC<SecretWordCardProps> = ({ rolePayload }) => {
  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  if (!rolePayload) return null;

  const isImposter = rolePayload.role === 'IMPOSTER';

  return (
    <div className="w-full max-w-sm mx-auto mb-6">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-purple-400" /> Private Role Card
        </span>
        <span className="text-xs text-gray-400">Hold to peek</span>
      </div>

      <div
        onMouseDown={() => setIsRevealed(true)}
        onMouseUp={() => setIsRevealed(false)}
        onMouseLeave={() => setIsRevealed(false)}
        onTouchStart={() => setIsRevealed(true)}
        onTouchEnd={() => setIsRevealed(false)}
        onClick={() => setIsRevealed(!isRevealed)}
        className={`relative overflow-hidden cursor-pointer rounded-2xl transition-all duration-300 p-5 border shadow-xl ${
          isRevealed
            ? isImposter
              ? 'bg-gradient-to-br from-rose-950/90 via-purple-950/90 to-dark-900 border-rose-500/60 shadow-rose-900/40'
              : 'bg-gradient-to-br from-indigo-950/90 via-purple-950/90 to-dark-900 border-neon-cyan/60 shadow-cyan-900/40'
            : 'glass-panel border-purple-500/30 hover:border-purple-500/60'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                isRevealed
                  ? isImposter
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-cyan-500/20 text-neon-cyan border border-cyan-500/30'
                  : 'bg-purple-900/40 text-purple-300 border border-purple-500/20'
              }`}
            >
              {isRevealed ? (
                isImposter ? (
                  <Skull className="w-6 h-6 animate-pulse" />
                ) : (
                  <UserCheck className="w-6 h-6" />
                )
              ) : (
                <Lock className="w-6 h-6" />
              )}
            </div>

            <div>
              <p className="text-xs text-purple-300 uppercase tracking-widest font-bold">
                {isRevealed ? (isImposter ? 'YOUR ROLE: IMPOSTER' : 'YOUR ROLE: CIVILIAN') : 'Tap/Hold to view'}
              </p>
              {isRevealed ? (
                <p
                  className={`text-2xl font-black tracking-wide ${
                    isImposter ? 'text-rose-400 neon-text-red' : 'text-neon-cyan neon-text-blue'
                  }`}
                >
                  {rolePayload.secretWord}
                </p>
              ) : (
                <p className="text-sm font-semibold text-gray-400">•••••••••••••</p>
              )}
            </div>
          </div>

          <button className="p-2.5 rounded-xl bg-purple-900/30 text-purple-300 hover:text-white transition-colors">
            {isRevealed ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {isRevealed && isImposter && (
          <p className="text-[11px] text-rose-300/80 mt-3 border-t border-rose-500/20 pt-2 italic">
            💡 Tip: You got a related word! Blend in by giving a convincing single-word clue.
          </p>
        )}
      </div>
    </div>
  );
};
