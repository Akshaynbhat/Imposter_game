import React, { useState } from 'react';
import { Volume2, VolumeX, LogOut, Copy, Check, ShieldAlert } from 'lucide-react';
import { sound } from '../services/sound';

interface NavbarProps {
  roomCode?: string;
  isConnected: boolean;
  onLeaveRoom?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ roomCode, isConnected, onLeaveRoom }) => {
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getMuted());
  const [copied, setCopied] = useState<boolean>(false);

  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="w-full glass-panel border-b border-purple-500/20 px-4 py-3 sm:px-8 flex items-center justify-between sticky top-0 z-50">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-[2px] flex items-center justify-center shadow-lg shadow-purple-500/20">
          <div className="w-full h-full bg-[#090714] rounded-[10px] flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-neon-cyan animate-pulse-slow" />
          </div>
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-purple-200 to-neon-blue bg-clip-text text-transparent">
            Imposter Clues
          </h1>
        </div>
      </div>

      {/* Center - Room Code Badge if in room */}
      {roomCode && (
        <div className="hidden sm:flex items-center gap-2 bg-purple-950/60 border border-purple-500/30 rounded-full px-4 py-1.5 shadow-inner">
          <span className="text-xs font-semibold text-purple-300 tracking-wider uppercase">Room:</span>
          <span className="text-base font-black tracking-widest text-neon-cyan">{roomCode}</span>
          <button
            onClick={handleCopyCode}
            className="p-1 hover:bg-purple-800/40 rounded-full transition-colors text-purple-300 hover:text-white"
            title="Copy room code"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Connection status indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/5 text-xs font-medium">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400 animate-ping'
            }`}
          />
          <span className="text-gray-300 hidden xs:inline">{isConnected ? 'Connected' : 'Reconnecting'}</span>
        </div>

        {/* Audio Toggle */}
        <button
          onClick={toggleSound}
          className="p-2 rounded-xl glass-card hover:bg-purple-600/20 transition-all text-purple-200 hover:text-white border border-purple-500/20"
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-gray-400" /> : <Volume2 className="w-5 h-5 text-neon-cyan" />}
        </button>

        {/* Leave Room button */}
        {onLeaveRoom && roomCode && (
          <button
            onClick={onLeaveRoom}
            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-all"
            title="Leave Room"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
};
