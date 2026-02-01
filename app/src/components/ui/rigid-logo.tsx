import * as React from "react";

interface RigidLogoProps {
  className?: string;
  size?: number;
}

export function RigidLogo({ className, size = 32 }: RigidLogoProps) {
  const aspectRatio = 130 / 113;
  const width = size * aspectRatio;
  const height = size;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 130 113"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
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
      {/* Window details on yellow face */}
      <path
        d="M92.4905 53.3794L92.5438 39.7694L104.288 32.9462L104.304 46.6232L92.4905 53.3794Z"
        fill="white"
        stroke="white"
        strokeWidth="0.272224"
      />
      <path
        d="M95.6658 49.2786L95.6906 42.95L101.151 39.7773L101.159 46.137L95.6658 49.2786Z"
        fill="black"
        stroke="black"
        strokeWidth="0.126582"
      />
      <path
        d="M68.9058 66.9988L68.9591 53.3888L80.703 46.5656L80.719 60.2426L68.9058 66.9988Z"
        fill="white"
        stroke="white"
        strokeWidth="0.272224"
      />
      <path
        d="M72.0811 62.8979L72.1059 56.5694L77.5667 53.3966L77.5741 59.7564L72.0811 62.8979Z"
        fill="black"
        stroke="black"
        strokeWidth="0.126582"
      />
    </svg>
  );
}
