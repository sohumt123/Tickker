import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { colors, gradients, fonts, shadows, textStyles } from '../DesignSystem';
import { TypewriterText } from '../shared/TypewriterText';

export const YCProblemSolution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Ultra-fast reveal animation
  const mainTextOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const solutionOpacity = interpolate(frame, [30, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: gradients.background, // Consistent light background
        fontFamily: fonts.family,
        padding: '80px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      {/* Problem Statement */}
      <div
        style={{
          opacity: mainTextOpacity,
          marginBottom: '60px',
          maxWidth: '1000px',
        }}
      >
        <h1 style={{ margin: '0 0 32px 0' }}>
          <TypewriterText
            text="The Problem"
            startFrame={5}
            fontSize="96px"
            useGradient={true} // Purple gradient
            speed={3}
          />
        </h1>
        
        <div style={{ marginBottom: '40px' }}>
          <TypewriterText
            text="Investing is lonely, confusing, and most people lose money"
            startFrame={35}
            fontSize="42px"
            useGradient={false} // Black text
            fontWeight="500"
            speed={4}
          />
        </div>
      </div>

      {/* Solution with Groups Focus */}
      <div
        style={{
          opacity: solutionOpacity,
          maxWidth: '1200px',
        }}
      >
        <h1 style={{ margin: '0 0 32px 0' }}>
          <TypewriterText
            text="Tickker Changes Everything"
            startFrame={70}
            fontSize="96px"
            useGradient={true} // Purple gradient
            speed={3}
          />
        </h1>
        
        <div style={{ marginBottom: '40px' }}>
          <TypewriterText
            text="Join investment groups • Track real performance • Beat the market together"
            startFrame={100}
            fontSize="42px"
            useGradient={false} // Black text
            fontWeight="500"
            speed={4}
          />
        </div>
      </div>

      {/* Bottom transition text */}
      <div
        style={{
          position: 'absolute',
          bottom: '60px',
          opacity: interpolate(frame, [fps * 2.5, fps * 3], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <TypewriterText
          text="Here's how it works..."
          startFrame={fps * 3.2}
          fontSize="28px"
          useGradient={true} // Purple gradient
          speed={4}
        />
      </div>
    </AbsoluteFill>
  );
};