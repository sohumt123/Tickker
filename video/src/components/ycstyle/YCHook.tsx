import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from 'remotion';
import { colors, gradients, fonts, shadows, textStyles } from '../DesignSystem';
import { TypewriterText } from '../shared/TypewriterText';

export const YCHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Text sequence with immediate transitions
  const textSequences = [
    {
      mainText: "70% of investors",
      subText: "lose to the market every year",
      startFrame: 0,
      duration: fps * 2.8,
    },
    {
      mainText: "Most people",
      subText: "invest alone without guidance or community",
      startFrame: fps * 2.6,
      duration: fps * 2.8,
    },
    {
      mainText: "What if you could",
      subText: "join groups, track performance, and actually win?",
      startFrame: fps * 5.2,
      duration: fps * 3.8,
    },
  ];

  const scale = spring({
    frame: frame - fps * 8.5,
    fps,
    config: {
      damping: 100,
      stiffness: 300,
    },
  });

  return (
    <AbsoluteFill
      style={{
        background: gradients.background, // Consistent light background
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: fonts.family,
        padding: '80px',
      }}
    >
      {/* Main content */}
      <div
        style={{
          textAlign: 'center',
          width: '100%',
          maxWidth: '1200px',
        }}
      >
        {textSequences.map((sequence, index) => {
          const isActive = frame >= sequence.startFrame && frame < (sequence.startFrame + sequence.duration);
          const sequenceFrame = frame - sequence.startFrame;
          
          if (!isActive) return null;

          const opacity = interpolate(sequenceFrame, [0, 8, sequence.duration - 8, sequence.duration], [0, 1, 1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          const slideY = interpolate(sequenceFrame, [0, 12], [20, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          const textScale = index === 2 ? scale : 1;

          return (
            <div
              key={index}
              style={{
                opacity,
                transform: `translateY(${slideY}px) scale(${textScale})`,
                width: '100%',
              }}
            >
              {/* Main text with purple gradient */}
              <h1 style={{ margin: '0 0 24px 0', textAlign: 'center' }}>
                <TypewriterText
                  text={sequence.mainText}
                  startFrame={sequence.startFrame + 10}
                  fontSize="120px"
                  useGradient={true} // Purple gradient
                  speed={2}
                />
              </h1>
              
              {/* Subtext in black */}
              <p style={{ margin: 0, textAlign: 'center' }}>
                <TypewriterText
                  text={sequence.subText}
                  startFrame={sequence.startFrame + 40}
                  fontSize="48px"
                  useGradient={false} // Black text
                  fontWeight="500"
                  speed={3}
                />
              </p>
            </div>
          );
        })}
      </div>

      {/* Bottom brand text */}
      <div
        style={{
          position: 'absolute',
          bottom: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: interpolate(frame, [fps * 8.6, fps * 9], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <TypewriterText
          text="Meet Tickker"
          startFrame={fps * 8.8}
          fontSize="32px"
          useGradient={true} // Purple gradient
          speed={3}
        />
      </div>
    </AbsoluteFill>
  );
};