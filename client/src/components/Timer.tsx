import React from 'react';
import { Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface TimerProps {
  seconds: number;
  totalSeconds: number;
  label?: string;
}

export const Timer: React.FC<TimerProps> = React.memo(({ seconds, totalSeconds, label = 'Time Remaining' }) => {
  const percentage = Math.max(0, Math.min(100, (seconds / totalSeconds) * 100));
  const isUrgent = seconds <= 5 && seconds > 0;

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center my-4">
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* SVG Circular Ring */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="56"
            cy="56"
            r={radius}
            className="stroke-purple-950/80"
            strokeWidth="8"
            fill="transparent"
          />
          <motion.circle
            cx="56"
            cy="56"
            r={radius}
            className={`transition-all duration-1000 ease-linear ${
              isUrgent
                ? 'stroke-rose-500 shadow-[0_0_20px_#f43f5e]'
                : 'stroke-neon-cyan shadow-[0_0_15px_#4cc9f0]'
            }`}
            strokeWidth="8"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "linear" }}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center Countdown Display */}
        <div className="absolute flex flex-col items-center justify-center">
          <motion.span
            key={seconds}
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-3xl font-black tracking-tight ${
              isUrgent
                ? 'text-rose-500 neon-text-red animate-pulse'
                : 'text-white neon-text-blue'
            }`}
          >
            {seconds}
          </motion.span>
          <span className="text-[10px] uppercase tracking-wider text-purple-300 font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3" /> Sec
          </span>
        </div>
      </div>

      {label && <p className="text-xs text-purple-300 font-medium tracking-wide mt-2">{label}</p>}
    </div>
  );
});

Timer.displayName = 'Timer';
