import React from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  seconds: number;
  totalSeconds: number;
  label?: string;
}

export const Timer: React.FC<TimerProps> = ({ seconds, totalSeconds, label = 'Time Remaining' }) => {
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
          <circle
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
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center Countdown Display */}
        <div className="absolute flex flex-col items-center justify-center">
          <span
            className={`text-3xl font-black tracking-tight ${
              isUrgent
                ? 'text-rose-500 animate-ping-slow neon-text-red'
                : 'text-white neon-text-blue'
            }`}
          >
            {seconds}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-purple-300 font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3" /> Sec
          </span>
        </div>
      </div>

      {label && <p className="text-xs text-purple-300 font-medium tracking-wide mt-2">{label}</p>}
    </div>
  );
};
