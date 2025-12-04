import React, { useEffect, useState } from 'react';

interface ConfettiProps {
  onComplete?: () => void;
}

export const Confetti: React.FC<ConfettiProps> = ({ onComplete }) => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    color: string;
    delay: number;
  }>>([]);

  useEffect(() => {
    const colors = ['#f093fb', '#f5576c', '#4facfe', '#43e97b', '#fa709a', '#fee140'];
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
    }));
    setParticles(newParticles);

    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            backgroundColor: particle.color,
            animation: `confettiFall ${2 + Math.random()}s ease-out ${particle.delay}s forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

interface CheckmarkAnimationProps {
  onComplete?: () => void;
}

export const CheckmarkAnimation: React.FC<CheckmarkAnimationProps> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-2xl animate-scale-in">
        <svg
          className="w-12 h-12 text-white animate-checkmark"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <style>{`
        @keyframes scale-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes checkmark {
          0% {
            stroke-dasharray: 0 24;
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dasharray: 24 24;
            stroke-dashoffset: 0;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }
        .animate-checkmark {
          animation: checkmark 0.5s ease-out 0.2s both;
        }
      `}</style>
    </div>
  );
};

interface HeartAnimationProps {
  onComplete?: () => void;
}

export const HeartAnimation: React.FC<HeartAnimationProps> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="text-6xl animate-heart-beat">💕</div>
      <style>{`
        @keyframes heart-beat {
          0%, 100% {
            transform: scale(1);
          }
          25% {
            transform: scale(1.3);
          }
          50% {
            transform: scale(1.1);
          }
          75% {
            transform: scale(1.3);
          }
        }
        .animate-heart-beat {
          animation: heart-beat 1s ease-in-out;
        }
      `}</style>
    </div>
  );
};

