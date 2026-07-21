import React, { useState, useEffect } from 'react';
import { Crown, Users, Copy, Check, Play, AlertCircle, Sparkles, Settings, Clock, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoomPublicState, GameSettings } from '../types/game';
import { sound } from '../services/sound';

interface LobbyScreenProps {
  roomState: RoomPublicState;
  myId?: string;
  onStartGame: (customCivilian?: string, customImposter?: string) => void;
  onToggleReady: () => void;
  onUpdateSettings: (settings: GameSettings) => void;
  error?: string | null;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  roomState,
  myId,
  onStartGame,
  onToggleReady,
  onUpdateSettings,
  error,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  
  // Custom word state (only relevant for host starting custom games)
  const [customCivilian, setCustomCivilian] = useState<string>('');
  const [customImposter, setCustomImposter] = useState<string>('');
  const [customError, setCustomError] = useState<string | null>(null);

  const me = roomState.players.find((p) => p.id === myId);
  const isHost = me?.isHost ?? false;
  const connectedCount = roomState.players.filter((p) => p.isConnected).length;
  
  // Start check: Host is ready. All non-host connected players must be Ready.
  const nonHosts = roomState.players.filter((p) => !p.isHost && p.isConnected);
  const allReady = nonHosts.every((p) => p.isReady);

  // Validate custom words
  useEffect(() => {
    if (roomState.settings.category === 'Custom') {
      const lettersOnly = /^[a-zA-Z]*$/;
      if (customCivilian.length > 0 && !lettersOnly.test(customCivilian)) {
        setCustomError('Words must contain letters only (no spaces or numbers)!');
      } else if (customImposter.length > 0 && !lettersOnly.test(customImposter)) {
        setCustomError('Words must contain letters only (no spaces or numbers)!');
      } else if (customCivilian.length > 20 || customImposter.length > 20) {
        setCustomError('Words must be 20 characters or less!');
      } else if (
        customCivilian.length > 0 &&
        customImposter.length > 0 &&
        customCivilian.toLowerCase() === customImposter.toLowerCase()
      ) {
        setCustomError('Civilian and Imposter words must be different!');
      } else {
        setCustomError(null);
      }
    } else {
      setCustomError(null);
    }
  }, [customCivilian, customImposter, roomState.settings.category]);

  const isCustomValid = roomState.settings.category === 'Custom'
    ? customCivilian.trim().length > 0 && customImposter.trim().length > 0 && !customError
    : true;

  const canStart = isHost && connectedCount >= 3 && allReady && isCustomValid;

  const handleCopyCode = () => {
    sound.playClick();
    navigator.clipboard.writeText(roomState.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSettingsChange = (key: keyof GameSettings, value: any) => {
    sound.playClick();
    const updated = {
      ...roomState.settings,
      [key]: value,
    };
    onUpdateSettings(updated);
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
    ];
    return gradients[index % gradients.length];
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="w-full max-w-4xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-3 gap-6"
    >
      {/* LEFT COLUMN: Room Info & Host Settings Panel */}
      <div className="md:col-span-2 space-y-6">
        
        {/* Room Code Card */}
        <div className="glass-panel rounded-3xl p-6 text-center border border-purple-500/30 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
          <p className="text-xs font-black uppercase tracking-widest text-purple-300 mb-1">
            Invite code
          </p>
          <div className="flex items-center justify-center gap-3 my-2">
            <span className="text-4xl sm:text-5xl font-black tracking-widest text-neon-cyan neon-text-blue font-mono">
              {roomState.code}
            </span>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleCopyCode}
              className="p-3 rounded-2xl glass-card hover:bg-purple-600/30 border border-purple-500/30 text-purple-200 hover:text-white transition-all shadow-md"
              title="Copy room code"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </motion.button>
          </div>
          <AnimatePresence>
            {copied && (
              <motion.p 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs font-bold text-emerald-400"
              >
                ✓ Invite Code Copied!
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Host Settings / Preview Box */}
        <div className="glass-panel rounded-3xl p-6 border border-purple-500/20 shadow-xl">
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-purple-500/25">
            <Settings className="w-5 h-5 text-neon-cyan" />
            <h3 className="text-base font-black text-white uppercase tracking-wider">Game Setup</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category Select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-purple-300 mb-1.5 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-neon-cyan" /> Word Category
                </label>
                {isHost ? (
                  <select
                    value={roomState.settings.category}
                    onChange={(e) => handleSettingsChange('category', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-purple-500/25 text-sm font-semibold text-white focus:outline-none focus:border-neon-cyan"
                  >
                    <option value="All">All Categories</option>
                    <option value="Food">Food</option>
                    <option value="Animals">Animals</option>
                    <option value="Technology">Technology</option>
                    <option value="Sports">Sports</option>
                    <option value="Movies">Movies</option>
                    <option value="Places">Places</option>
                    <option value="Custom">Custom Words</option>
                  </select>
                ) : (
                  <div className="px-3 py-2.5 rounded-xl bg-dark-900/50 border border-purple-500/10 text-sm font-semibold text-neon-cyan">
                    {roomState.settings.category}
                  </div>
                )}
              </div>

              {/* Difficulty Select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-purple-300 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-neon-gold" /> Difficulty
                </label>
                {isHost ? (
                  <select
                    value={roomState.settings.difficulty}
                    disabled={roomState.settings.category === 'Custom'}
                    onChange={(e) => handleSettingsChange('difficulty', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-purple-500/25 text-sm font-semibold text-white focus:outline-none focus:border-neon-cyan disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="All">All Difficulties</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                ) : (
                  <div className="px-3 py-2.5 rounded-xl bg-dark-900/50 border border-purple-500/10 text-sm font-semibold text-neon-gold">
                    {roomState.settings.category === 'Custom' ? 'N/A' : roomState.settings.difficulty}
                  </div>
                )}
              </div>

              {/* Clue Timer Select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-purple-300 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-rose-400" /> Clue Submission Limit
                </label>
                {isHost ? (
                  <select
                    value={roomState.settings.roundTimer}
                    onChange={(e) => handleSettingsChange('roundTimer', Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-purple-500/25 text-sm font-semibold text-white focus:outline-none focus:border-neon-cyan"
                  >
                    <option value={15}>15 Seconds (Default)</option>
                    <option value={30}>30 Seconds</option>
                    <option value={45}>45 Seconds</option>
                  </select>
                ) : (
                  <div className="px-3 py-2.5 rounded-xl bg-dark-900/50 border border-purple-500/10 text-sm font-semibold text-purple-200">
                    {roomState.settings.roundTimer} Seconds
                  </div>
                )}
              </div>

              {/* Discussion Timer Select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-purple-300 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" /> Discussion Length
                </label>
                {isHost ? (
                  <select
                    value={roomState.settings.discussionTimer}
                    onChange={(e) => handleSettingsChange('discussionTimer', Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-purple-500/25 text-sm font-semibold text-white focus:outline-none focus:border-neon-cyan"
                  >
                    <option value={30}>30 Seconds</option>
                    <option value={45}>45 Seconds (Default)</option>
                    <option value={60}>60 Seconds</option>
                  </select>
                ) : (
                  <div className="px-3 py-2.5 rounded-xl bg-dark-900/50 border border-purple-500/10 text-sm font-semibold text-purple-200">
                    {roomState.settings.discussionTimer} Seconds
                  </div>
                )}
              </div>
            </div>

            {/* Custom Words Inputs */}
            {roomState.settings.category === 'Custom' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 pt-4 border-t border-purple-500/15 space-y-3"
              >
                <h4 className="text-xs font-black uppercase text-purple-300 tracking-wider">
                  Configure Custom Words
                </h4>
                {isHost ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 mb-1">
                        Civilian Word
                      </label>
                      <input
                        type="text"
                        value={customCivilian}
                        onChange={(e) => setCustomCivilian(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                        placeholder="e.g. Apple"
                        className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-purple-500/25 text-xs text-white focus:outline-none focus:border-neon-cyan font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 mb-1">
                        Imposter Word
                      </label>
                      <input
                        type="text"
                        value={customImposter}
                        onChange={(e) => setCustomImposter(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                        placeholder="e.g. Pear"
                        className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-purple-500/25 text-xs text-white focus:outline-none focus:border-neon-cyan font-semibold"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/10 text-center text-xs text-purple-300 font-semibold italic">
                    Host is configuring secret custom words...
                  </div>
                )}
                {customError && (
                  <div className="p-2 bg-rose-500/15 border border-rose-500/30 rounded-xl text-[11px] font-semibold text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{customError}</span>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Joined Players list & Main Ready Actions */}
      <div className="space-y-6">
        <div className="glass-panel rounded-3xl p-6 border border-purple-500/20 shadow-xl flex flex-col h-full justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-purple-500/15">
              <span className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-1.5">
                <Users className="w-4 h-4 text-neon-cyan" /> Crew {connectedCount}/10
              </span>
              <span className="text-[10px] bg-purple-950 px-2 py-0.5 rounded border border-purple-500/30 text-purple-300 font-bold">
                Min 3
              </span>
            </div>

            {/* Players list */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {roomState.players.map((player, idx) => {
                const isMe = player.id === myId;
                return (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={player.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                      isMe
                        ? 'bg-purple-900/35 border-neon-cyan/45 shadow-[0_0_10px_rgba(0,245,212,0.15)]'
                        : 'glass-card border-purple-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${getAvatarGradient(idx)} flex items-center justify-center text-white font-black text-[11px] shadow-sm`}>
                        {getInitials(player.name)}
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-white flex items-center gap-1 truncate">
                          <span className="truncate">{player.name}</span>
                          {isMe && <span className="text-[9px] bg-neon-blue/20 text-neon-blue px-1 rounded font-normal">ME</span>}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {player.isConnected ? (
                            player.isHost ? (
                              <span className="text-amber-400 flex items-center gap-0.5">
                                <Crown className="w-3 h-3 fill-amber-400" /> Host
                              </span>
                            ) : player.isReady ? (
                              <span className="text-emerald-400 font-semibold">Ready!</span>
                            ) : (
                              <span className="text-rose-400">Not Ready</span>
                            )
                          ) : (
                            <span className="text-gray-500 italic">Disconnected</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {!player.isHost && player.isConnected && (
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                        player.isReady ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-rose-500/40 text-rose-400'
                      }`}>
                        {player.isReady ? '✓' : '✕'}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="pt-6 border-t border-purple-500/15 mt-4 space-y-3">
            {/* Display status flags */}
            {connectedCount < 3 && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Need 3+ connected players.</span>
              </div>
            )}

            {connectedCount >= 3 && !allReady && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>All players must mark themselves Ready.</span>
              </div>
            )}

            {isHost && roomState.settings.category === 'Custom' && (!customCivilian.trim() || !customImposter.trim() || customError) && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Please complete custom words configuration.</span>
              </div>
            )}

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 text-[11px] font-semibold text-center leading-relaxed">
                {error}
              </div>
            )}

            {/* Toggle Ready button for non-host */}
            {!isHost && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  sound.playClick();
                  onToggleReady();
                }}
                className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-1.5 shadow-lg border transition-all ${
                  me?.isReady
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/20'
                    : 'bg-dark-900 hover:bg-purple-950/20 border-purple-500/30 text-purple-200 hover:text-white'
                }`}
              >
                {me?.isReady ? '✓ Marked Ready' : '✕ Set Ready'}
              </motion.button>
            )}

            {/* Host Controls */}
            {isHost && (
              <motion.button
                whileHover={canStart ? { scale: 1.03 } : {}}
                whileTap={canStart ? { scale: 0.97 } : {}}
                onClick={() => {
                  sound.playClick();
                  onStartGame(customCivilian, customImposter);
                }}
                disabled={!canStart}
                className="w-full py-3.5 rounded-2xl neon-btn-primary font-black text-sm text-white flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Launch Game</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
