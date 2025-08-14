import React from 'react';
import { AbsoluteFill } from 'remotion';

export const SimpleTest: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <h1
        style={{
          fontSize: '72px',
          fontWeight: '800',
          background: 'linear-gradient(to right, #4f46e5, #d946ef, #06b6d4)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Tickker Test
      </h1>
    </AbsoluteFill>
  );
};