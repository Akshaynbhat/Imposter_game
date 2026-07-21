import React, { useState } from 'react';
import { PlusCircle, LogIn, Sparkles, User, KeyRound, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sound } from '../services/sound';

interface HomeScreenProps {
  onCreateRoom: (name: string) => Promise<boolean>;
  onJoinRoom: (code: string, name: string) => Promise<boolean>;
  initialName?: string;
  error?: string | null;
  clearError?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onCreateRoom,
  onJoinRoom,
  initialName = '',
  error,
  clearError,
}) => {
  const [name, setName] = useState<string>(initialName);
  const [roomCode, setRoomCode] = useState<string>('');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleCreate = async () => {
    sound.playClick();
    if (!name.trim()) {
      setValidationError('Please enter your player name!');
      return;
    }
    setValidationError(null);
    if (clearError) clearError();
    setIsLoading(true);
    await onCreateRoom(name);
    setIsLoading(false);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    if (!name.trim()) {
      setValidationError('Please enter your player name!');
      return;
    }
    if (!roomCode.trim() || roomCode.trim().length < 6) {
      setValidationError('Please enter a valid 6-character room code!');
      return;
    }
    setValidationError(null);
    if (clearError) clearError();
    setIsLoading(true);
    const ok = await onJoinRoom(roomCode, name);
    setIsLoading(false);
    if (ok) {
      setIsJoinModalOpen(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8 relative"
    >
      {/* Background Neon Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-neon-blue/15 rounded-full blur-[90px] pointer-events-none" />

      {/* Main Glass Card */}
      <motion.div 
        whileHover={{ boxShadow: "0 0 35px rgba(157, 78, 221, 0.35)" }}
        className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 border border-purple-500/20 shadow-2xl relative z-10 animate-glow-pulse"
      >
        {/* Header Hero Title */}
        <div className="text-center mb-8">
          <motion.div 
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-neon-blue p-[2px] mb-4 shadow-lg shadow-purple-500/30"
          >
            <div className="w-full h-full bg-[#0b0a1a] rounded-[14px] flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-neon-cyan" />
            </div>
          </motion.div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">
            IMPOSTER <span className="bg-gradient-to-r from-neon-purple to-neon-blue bg-clip-text text-transparent">CLUES</span>
          </h2>
          <p className="text-sm text-purple-200/80 font-medium">
            3 to 10 players • Blend in or catch the imposter!
          </p>
        </div>

        {/* Global or Validation Error Banner */}
        <AnimatePresence mode="wait">
          {(error || validationError) && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm font-semibold text-center flex items-center justify-center gap-2 overflow-hidden"
            >
              <span>⚠️</span>
              <span>{validationError || error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player Name Input */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-purple-300 mb-2 flex items-center gap-1.5">
              <User className="w-4 h-4 text-neon-cyan" /> Your Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setValidationError(null);
              }}
              placeholder="e.g. Akshay, Detective, Riya"
              maxLength={16}
              className="w-full px-4 py-3.5 rounded-xl glass-input text-base font-semibold placeholder:text-gray-500 transition-all"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreate}
            disabled={isLoading}
            className="w-full py-4 px-6 rounded-xl neon-btn-primary font-bold text-lg text-white flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Create New Room</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              sound.playClick();
              setValidationError(null);
              setIsJoinModalOpen(true);
            }}
            disabled={isLoading}
            className="w-full py-4 px-6 rounded-xl glass-card hover:bg-purple-800/30 border border-purple-500/30 font-bold text-lg text-purple-200 hover:text-white flex items-center justify-center gap-2 transition-all"
          >
            <LogIn className="w-5 h-5 text-neon-cyan" />
            <span>Join Existing Room</span>
          </motion.button>
        </div>

        {/* How to play summary footer */}
        <div className="mt-8 pt-6 border-t border-purple-500/15 text-center">
          <p className="text-xs text-purple-300/70 flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-neon-gold" />
            Civilians get the same word. Imposter gets a close match!
          </p>
        </div>
      </motion.div>

      {/* Join Room Modal */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 border border-purple-500/30 shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-neon-cyan" /> Join Room
                </h3>
                <button
                  onClick={() => {
                    sound.playClick();
                    setIsJoinModalOpen(false);
                  }}
                  className="text-gray-400 hover:text-white font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleJoinSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-purple-300 mb-2">
                    Enter 6-Character Room Code
                  </label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AB42KD"
                    maxLength={6}
                    className="w-full px-4 py-3.5 rounded-xl glass-input text-center text-2xl font-black tracking-widest text-neon-cyan uppercase placeholder:text-gray-600"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setIsJoinModalOpen(false);
                    }}
                    className="flex-1 py-3 rounded-xl glass-card font-semibold text-gray-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3 rounded-xl neon-btn-secondary font-bold text-white shadow-lg disabled:opacity-50"
                  >
                    Join Game
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
