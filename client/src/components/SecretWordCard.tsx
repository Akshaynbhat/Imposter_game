import React from 'react';
import { Lock, UserCheck, Skull } from 'lucide-react';
import { PersonalRolePayload } from '../types/game';

interface SecretWordCardProps {
  rolePayload: PersonalRolePayload | null;
}

export const SecretWordCard: React.FC<SecretWordCardProps> = ({ rolePayload }) => {
  if (!rolePayload) return null;

  const isImposter = rolePayload.role === 'IMPOSTER';

  return (
    <div className="w-full max-w-sm mx-auto mb-6">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-purple-400" /> Your Secret Role Card
        </span>
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl border p-5 shadow-xl transition-all duration-300 ${
          isImposter
            ? 'bg-gradient-to-br from-rose-950/90 via-purple-950/90 to-dark-900 border-rose-500/60 shadow-rose-900/40 shadow-[0_0_20px_rgba(244,63,94,0.15)] animate-pulse-slow'
            : 'bg-gradient-to-br from-indigo-950/90 via-purple-950/90 to-dark-900 border-neon-cyan/60 shadow-cyan-900/40 shadow-[0_0_20px_rgba(0,245,212,0.15)]'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-colors ${
              isImposter
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                : 'bg-cyan-500/20 text-neon-cyan border-cyan-500/30'
            }`}
          >
            {isImposter ? (
              <Skull className="w-6 h-6 text-rose-400" />
            ) : (
              <UserCheck className="w-6 h-6 text-neon-cyan" />
            )}
          </div>

          <div>
            <p className={`text-[10px] uppercase tracking-widest font-black ${isImposter ? 'text-rose-400' : 'text-neon-cyan'}`}>
              {isImposter ? 'ROLE: IMPOSTER' : 'ROLE: CIVILIAN'}
            </p>
            <p
              className={`text-2xl font-black tracking-wide ${
                isImposter ? 'text-rose-400 neon-text-red' : 'text-neon-cyan neon-text-blue'
              }`}
            >
              {rolePayload.secretWord}
            </p>
          </div>
        </div>

        {isImposter && (
          <p className="text-[10px] text-rose-350 mt-3 border-t border-rose-500/20 pt-2 italic">
            💡 Blending Tip: Civilians have a related but different word. Make your clues subtle to keep them guessing!
          </p>
        )}
      </div>
    </div>
  );
};
