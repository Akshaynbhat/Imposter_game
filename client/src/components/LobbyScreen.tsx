import React, { useState } from 'react';
import { Crown, Users, Copy, Check, Play, AlertCircle, UserCheck } from 'lucide-react';
import { RoomPublicState } from '../types/game';

interface LobbyScreenProps {
  roomState: RoomPublicState;
  myId?: string;
  onStartGame: () => void;
  error?: string | null;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({ roomState, myId, onStartGame, error }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const me = roomState.players.find((p) => p.id === myId);
  const isHost = me?.isHost ?? false;
  const connectedCount = roomState.players.filter((p) => p.isConnected).length;
  const canStart = isHost && connectedCount >= 3;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomState.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getInitials = (name: string) => {
    return name
      .trim()
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getAvatarGradient = (index: number) => {
    const gradients = [
      'from-purple-600 to-indigo-600',
      'from-cyan-500 to-blue-600',
      'from-pink-500 to-rose-600',
      'from-amber-500 to-orange-600',
      'from-emerald-500 to-teal-600',
      'from-violet-600 to-purple-800',
      'from-fuchsia-600 to-pink-600',
      'from-sky-500 to-indigo-700',
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8">
      {/* Top Room Code Banner Card */}
      <div className="glass-panel rounded-3xl p-6 mb-6 text-center border border-purple-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <p className="text-xs font-extrabold uppercase tracking-widest text-purple-300 mb-1">
          Share Room Code With Friends
        </p>

        <div className="flex items-center justify-center gap-3 my-3">
          <span className="text-4xl sm:text-5xl font-black tracking-widest text-neon-cyan neon-text-blue font-mono">
            {roomState.code}
          </span>
          <button
            onClick={handleCopyCode}
            className="p-3 rounded-2xl glass-card hover:bg-purple-600/30 border border-purple-500/30 text-purple-200 hover:text-white transition-all shadow-md"
            title="Copy room code"
          >
            {copied ? <Check className="w-6 h-6 text-emerald-400" /> : <Copy className="w-6 h-6" />}
          </button>
        </div>

        {copied && (
          <p className="text-xs font-semibold text-emerald-400 animate-in fade-in duration-200">
            ✓ Room code copied to clipboard!
          </p>
        )}
      </div>

      {/* Players List Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 mb-6 border border-purple-500/20 shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-purple-500/20">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-neon-cyan" />
            <h3 className="text-lg font-bold text-white">Players Joined</h3>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-900/60 border border-purple-500/30 text-purple-200">
            {connectedCount} / 10 (Min 3)
          </span>
        </div>

        {/* Players Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {roomState.players.map((player, idx) => {
            const isMe = player.id === myId;
            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  isMe
                    ? 'bg-purple-900/40 border-neon-cyan/50 shadow-[0_0_15px_rgba(76,201,240,0.15)]'
                    : 'glass-card border-purple-500/20'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Initials Avatar */}
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${getAvatarGradient(
                      idx
                    )} flex items-center justify-center text-white font-black text-sm shadow-md flex-shrink-0`}
                  >
                    {getInitials(player.name)}
                  </div>

                  <div className="truncate">
                    <p className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                      <span>{player.name}</span>
                      {isMe && (
                        <span className="text-[10px] bg-neon-blue/20 text-neon-blue font-semibold px-1.5 py-0.5 rounded">
                          YOU
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      {player.isConnected ? 'Ready' : 'Disconnected'}
                    </p>
                  </div>
                </div>

                {/* Host Crown Icon */}
                {player.isHost && (
                  <div
                    className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 flex-shrink-0"
                    title="Room Host"
                  >
                    <Crown className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Player Count Warning */}
        {connectedCount < 3 && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Waiting for at least 3 players before the game can start.</span>
          </div>
        )}

        {/* Start Game / Waiting Message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-semibold mb-4 text-center">
            {error}
          </div>
        )}

        {isHost ? (
          <button
            onClick={onStartGame}
            disabled={!canStart}
            className="w-full py-4 px-6 rounded-2xl neon-btn-primary font-black text-lg text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Start Game</span>
          </button>
        ) : (
          <div className="text-center py-4 px-6 rounded-2xl glass-card border border-purple-500/20 text-purple-200 text-sm font-semibold flex items-center justify-center gap-2">
            <UserCheck className="w-5 h-5 text-neon-cyan animate-pulse" />
            <span>Waiting for room host to start the game...</span>
          </div>
        )}
      </div>
    </div>
  );
};
