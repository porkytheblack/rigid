'use client';

import { useState, useEffect, useRef, type CSSProperties } from 'react';

export type RigidAnimation =
  | 'idle'
  | 'bounce'
  | 'spin'
  | 'shake'
  | 'track'
  | 'blink'
  | 'wave'
  | 'pulse'
  | 'work'
  | 'celebrate'
  | 'sad'
  | 'think';

interface RigidCharacterProps {
  animation?: RigidAnimation;
  size?: number;
  className?: string;
  trackMouse?: boolean;
}

export function RigidCharacter({
  animation = 'idle',
  size = 48,
  className = '',
  trackMouse = false,
}: RigidCharacterProps) {
  const [blink, setBlink] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Blinking logic
  useEffect(() => {
    if (animation !== 'blink' && animation !== 'idle' && animation !== 'track') return;

    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, animation === 'blink' ? 1500 : 3000);

    return () => clearInterval(blinkInterval);
  }, [animation]);

  // Mouse tracking
  useEffect(() => {
    if (!trackMouse && animation !== 'track') return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [trackMouse, animation]);

  // Calculate eye offset for tracking
  const getEyeOffset = () => {
    if ((animation !== 'track' && !trackMouse) || !containerRef?.current) {
      return { x: 0, y: 0 };
    }

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (mousePos.x - centerX) / rect.width;
    const deltaY = (mousePos.y - centerY) / rect.height;

    return {
      x: Math.max(-2, Math.min(2, deltaX * 4)),
      y: Math.max(-1.5, Math.min(1.5, deltaY * 3))
    };
  };

  const eyeOffset = getEyeOffset();
  const eyeScaleY = blink ? 0.1 : 1;

  const animationClass: Record<RigidAnimation, string> = {
    idle: 'rigid-animate-idle',
    bounce: 'rigid-animate-bounce',
    spin: 'rigid-animate-spin-y',
    shake: 'rigid-animate-shake',
    track: '',
    blink: 'rigid-animate-idle',
    wave: 'rigid-animate-wave',
    pulse: 'rigid-animate-pulse',
    work: 'rigid-animate-work',
    celebrate: 'rigid-animate-celebrate',
    sad: 'rigid-animate-sad',
    think: 'rigid-animate-think',
  };

  const aspectRatio = 130 / 113;
  const width = size * aspectRatio;
  const height = size;

  return (
    <div
      ref={containerRef}
      className={`relative ${animationClass[animation]} ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 130 113"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top face - white */}
        <path
          d="M21.6687 24.8282L65.0641 0L108.341 24.8282L64.8597 50L21.6687 24.8282Z"
          fill="white"
        />
        {/* Left face - black */}
        <path
          d="M21.7994 24.9292L64.999 50.0966L65.1355 99.9895L21.5955 74.9196L21.7994 24.9292Z"
          fill="black"
        />
        {/* Right face - yellow */}
        <path
          d="M64.838 99.9895L65.0339 49.994L108.174 24.9292L108.233 75.171L64.838 99.9895Z"
          fill="#FFFF00"
        />

        {/* Top eye white */}
        <path
          d="M92.4905 53.3794L92.5438 39.7694L104.288 32.9462L104.304 46.6232L92.4905 53.3794Z"
          fill="white"
          stroke="white"
          strokeWidth="0.272224"
        />
        {/* Top eye pupil */}
        <g style={{
          transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)`,
          transformOrigin: '98.4px 44.5px'
        } as CSSProperties}>
          <path
            d="M95.6658 49.2786L95.6906 42.95L101.151 39.7773L101.159 46.137L95.6658 49.2786Z"
            fill="black"
            stroke="black"
            strokeWidth="0.126582"
            style={{
              transform: `scaleY(${eyeScaleY})`,
              transformOrigin: '98.4px 44.5px',
              transition: 'transform 0.1s ease'
            }}
          />
        </g>

        {/* Bottom eye white */}
        <path
          d="M68.9058 66.9988L68.9591 53.3888L80.703 46.5656L80.719 60.2426L68.9058 66.9988Z"
          fill="white"
          stroke="white"
          strokeWidth="0.272224"
        />
        {/* Bottom eye pupil */}
        <g style={{
          transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)`,
          transformOrigin: '74.8px 58px'
        } as CSSProperties}>
          <path
            d="M72.0811 62.8979L72.1059 56.5694L77.5667 53.3966L77.5741 59.7564L72.0811 62.8979Z"
            fill="black"
            stroke="black"
            strokeWidth="0.126582"
            style={{
              transform: `scaleY(${eyeScaleY})`,
              transformOrigin: '74.8px 58px',
              transition: 'transform 0.1s ease'
            }}
          />
        </g>
      </svg>

      {/* Glow effect for pulse animation */}
      {animation === 'pulse' && (
        <div className="absolute inset-0 rigid-animate-ping opacity-30">
          <svg
            width={width}
            height={height}
            viewBox="0 0 130 113"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M64.838 99.9895L65.0339 49.994L108.174 24.9292L108.233 75.171L64.838 99.9895Z"
              fill="#FFFF00"
            />
          </svg>
        </div>
      )}

      {/* Celebration particles */}
      {animation === 'celebrate' && (
        <>
          <div className="absolute -top-2 left-1/4 w-1.5 h-1.5 bg-[#FFFF00] rigid-animate-particle-1" />
          <div className="absolute -top-1 right-1/4 w-1 h-1 bg-white rigid-animate-particle-2" />
          <div className="absolute top-0 left-1/2 w-1 h-1 bg-[#FFFF00] rigid-animate-particle-3" />
        </>
      )}
    </div>
  );
}

// Mini version for inline use (e.g., in buttons, badges)
export function RigidCharacterMini({
  animation = 'idle',
  size = 20,
  className = '',
}: Omit<RigidCharacterProps, 'trackMouse'>) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (animation !== 'blink' && animation !== 'idle') return;

    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, animation === 'blink' ? 1500 : 4000);

    return () => clearInterval(blinkInterval);
  }, [animation]);

  const eyeScaleY = blink ? 0.1 : 1;

  const animationClass: Record<RigidAnimation, string> = {
    idle: 'rigid-animate-idle',
    bounce: 'rigid-animate-bounce',
    spin: 'rigid-animate-spin-y',
    shake: 'rigid-animate-shake',
    track: '',
    blink: 'rigid-animate-idle',
    wave: 'rigid-animate-wave',
    pulse: 'rigid-animate-pulse',
    work: 'rigid-animate-work',
    celebrate: 'rigid-animate-celebrate',
    sad: 'rigid-animate-sad',
    think: 'rigid-animate-think',
  };

  const aspectRatio = 130 / 113;
  const width = size * aspectRatio;
  const height = size;

  return (
    <div
      className={`relative ${animationClass[animation]} ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 130 113"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top face - white */}
        <path
          d="M21.6687 24.8282L65.0641 0L108.341 24.8282L64.8597 50L21.6687 24.8282Z"
          fill="white"
        />
        {/* Left face - black */}
        <path
          d="M21.7994 24.9292L64.999 50.0966L65.1355 99.9895L21.5955 74.9196L21.7994 24.9292Z"
          fill="black"
        />
        {/* Right face - yellow */}
        <path
          d="M64.838 99.9895L65.0339 49.994L108.174 24.9292L108.233 75.171L64.838 99.9895Z"
          fill="#FFFF00"
        />

        {/* Top eye white */}
        <path
          d="M92.4905 53.3794L92.5438 39.7694L104.288 32.9462L104.304 46.6232L92.4905 53.3794Z"
          fill="white"
          stroke="white"
          strokeWidth="0.272224"
        />
        {/* Top eye pupil */}
        <path
          d="M95.6658 49.2786L95.6906 42.95L101.151 39.7773L101.159 46.137L95.6658 49.2786Z"
          fill="black"
          stroke="black"
          strokeWidth="0.126582"
          style={{
            transform: `scaleY(${eyeScaleY})`,
            transformOrigin: '98.4px 44.5px',
            transition: 'transform 0.1s ease'
          }}
        />

        {/* Bottom eye white */}
        <path
          d="M68.9058 66.9988L68.9591 53.3888L80.703 46.5656L80.719 60.2426L68.9058 66.9988Z"
          fill="white"
          stroke="white"
          strokeWidth="0.272224"
        />
        {/* Bottom eye pupil */}
        <path
          d="M72.0811 62.8979L72.1059 56.5694L77.5667 53.3966L77.5741 59.7564L72.0811 62.8979Z"
          fill="black"
          stroke="black"
          strokeWidth="0.126582"
          style={{
            transform: `scaleY(${eyeScaleY})`,
            transformOrigin: '74.8px 58px',
            transition: 'transform 0.1s ease'
          }}
        />
      </svg>
    </div>
  );
}
