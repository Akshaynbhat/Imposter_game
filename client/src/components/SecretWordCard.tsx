import React from 'react';
import { Lock, HelpCircle } from 'lucide-react';
import { PersonalRolePayload } from '../types/game';

interface SecretWordCardProps {
  rolePayload: PersonalRolePayload | null;
}

export const SecretWordCard: React.FC<SecretWordCardProps> = ({ rolePayload }) => {
  if (!rolePayload) return null;

  return (
    <div className="w-full max-w-sm mx-auto mb-6">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-purple-400" /> Your Secret Word Card
        </span>
      </div>

      <div className="relative overflow-hidden rounded-2xl border p-5 shadow-xl transition-all duration-300 bg-gradient-to-br from-indigo-950/90 via-purple-950/90 to-dark-900 border-neon-cyan/60 shadow-cyan-900/40 shadow-[0_0_20px_rgba(0,245,212,0.15)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center border transition-colors bg-cyan-500/20 text-neon-cyan border-cyan-500/30">
            <HelpCircle className="w-6 h-6 text-neon-cyan" />
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest font-black text-neon-cyan">
              YOUR SECRET WORD
            </p>
            <p className="text-2xl font-black tracking-wide text-neon-cyan neon-text-blue">
              {rolePayload.secretWord}
            </p>
          </div>
        </div>

        <p className="text-[10px] text-purple-300/80 mt-3 border-t border-purple-500/20 pt-2 italic">
          💡 Hint: Give a subtle clue about your word without giving it away to others!
        </p>
      </div>
    </div>
  );
};

