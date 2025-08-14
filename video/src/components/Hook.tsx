import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from 'remotion';

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const textSequences = [
    {
      text: "70% of investors",
      startFrame: 0,
      color: '#ef4444',
    },
    {
      text: "lose to the market",
      startFrame: fps * 1.5,
      color: '#ef4444',
    },
    {
      text: "What if you could change that?",
      startFrame: fps * 3,
      color: '#22c55e',
    },
  ];

  const scale = spring({
    frame: frame - fps * 4,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
    },
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          transform: frame > fps * 4 ? `scale(${scale})` : 'scale(1)',
        }}
      >
        {textSequences.map((sequence, index) => {
          const opacity = interpolate(
            frame,
            [sequence.startFrame, sequence.startFrame + 20],
            [0, 1],
            {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }
          );

          const slideUp = interpolate(
            frame,
            [sequence.startFrame, sequence.startFrame + 20],
            [50, 0],
            {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }
          );

          return (
            <h1
              key={index}
              style={{
                fontSize: index === 2 ? '72px' : '96px',
                fontWeight: 'bold',
                color: sequence.color,
                margin: '20px 0',
                fontFamily: 'Arial, sans-serif',
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                opacity,
                transform: `translateY(${slideUp}px)`,
                lineHeight: 1.1,
              }}
            >
              {sequence.text}
            </h1>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};