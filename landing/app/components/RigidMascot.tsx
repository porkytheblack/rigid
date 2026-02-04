'use client';

import { useEffect, useState, useRef } from 'react';
import styles from './RigidMascot.module.css';

interface RigidMascotProps {
  size?: number;
  className?: string;
  interactive?: boolean;
}

export default function RigidMascot({
  size = 130,
  className = '',
  interactive = true
}: RigidMascotProps) {
  const scale = size / 130;
  const containerRef = useRef<HTMLDivElement>(null);

  // Eye state: position offset for "looking" behavior
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  // Blink state
  const [isBlinking, setIsBlinking] = useState(false);

  // Blink randomly every 2-5 seconds
  useEffect(() => {
    const blink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150); // 150ms blink duration per motion system
    };

    const scheduleNextBlink = () => {
      const delay = 2000 + Math.random() * 3000; // 2-5 seconds
      return setTimeout(() => {
        blink();
        blinkTimeout = scheduleNextBlink();
      }, delay);
    };

    let blinkTimeout = scheduleNextBlink();

    return () => clearTimeout(blinkTimeout);
  }, []);

  // Track mouse/cursor for "looking" behavior (±3px offset max per motion system)
  useEffect(() => {
    if (!interactive) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate direction to mouse
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      // Normalize and clamp to ±3px (scaled)
      const maxOffset = 3 * scale;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > 0) {
        const normalizedX = (deltaX / distance) * Math.min(distance / 100, 1) * maxOffset;
        const normalizedY = (deltaY / distance) * Math.min(distance / 100, 1) * maxOffset;
        setEyeOffset({ x: normalizedX, y: normalizedY });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [interactive, scale]);

  // Pupil transform based on eye offset and blink state
  const pupilTransform = `translate(${eyeOffset.x}px, ${eyeOffset.y}px) scaleY(${isBlinking ? 0.1 : 1})`;

  return (
    <div
      ref={containerRef}
      className={`${styles.mascotContainer} ${className}`}
      style={{ width: size, height: Math.round(113 * scale) }}
    >
      <svg
        width={size}
        height={Math.round(113 * scale)}
        viewBox="0 0 130 113"
        fill="none"
        className={styles.mascotSvg}
        aria-hidden="true"
      >
        {/* Top face - white */}
        <path
          d="M21.6687 24.8282L65.0641 0L108.341 24.8282L64.8597 50L21.6687 24.8282Z"
          fill="white"
        />
        {/* Left face - black/dark */}
        <path
          d="M21.7994 24.9292L64.999 50.0966L65.1355 99.9895L21.5955 74.9196L21.7994 24.9292Z"
          fill="#0a0a0a"
        />
        {/* Right face - yellow */}
        <path
          d="M64.838 99.9895L65.0339 49.994L108.174 24.9292L108.233 75.171L64.838 99.9895Z"
          fill="#FACC15"
        />

        {/* Right eye - white outer */}
        <path
          d="M92.4905 53.3794L92.5438 39.7694L104.288 32.9462L104.304 46.6232L92.4905 53.3794Z"
          fill="white"
          stroke="white"
          strokeWidth="0.272224"
        />
        {/* Right eye - black pupil (animated) */}
        <g style={{ transform: pupilTransform, transformOrigin: '98.4px 46px', transition: 'transform 0.1s ease-out' }}>
          <path
            d="M95.6658 49.2786L95.6906 42.95L101.151 39.7773L101.159 46.137L95.6658 49.2786Z"
            fill="#0a0a0a"
            stroke="#0a0a0a"
            strokeWidth="0.126582"
          />
        </g>

        {/* Left eye - white outer */}
        <path
          d="M68.9058 66.9988L68.9591 53.3888L80.703 46.5656L80.719 60.2426L68.9058 66.9988Z"
          fill="white"
          stroke="white"
          strokeWidth="0.272224"
        />
        {/* Left eye - black pupil (animated) */}
        <g style={{ transform: pupilTransform, transformOrigin: '74.8px 59.5px', transition: 'transform 0.1s ease-out' }}>
          <path
            d="M72.0811 62.8979L72.1059 56.5694L77.5667 53.3966L77.5741 59.7564L72.0811 62.8979Z"
            fill="#0a0a0a"
            stroke="#0a0a0a"
            strokeWidth="0.126582"
          />
        </g>
      </svg>
    </div>
  );
}
