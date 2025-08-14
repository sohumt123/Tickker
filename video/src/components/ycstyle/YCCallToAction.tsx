import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from 'remotion';
import { colors, gradients, fonts, shadows, textStyles } from '../DesignSystem';
import { TypewriterText } from '../shared/TypewriterText';

export const YCCallToAction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: {
      damping: 100,
      stiffness: 300,
    },
  });

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const buttonPulse = interpolate(frame, [40, 70, 100], [1, 1.05, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const urgencyText = interpolate(frame, [130, 150], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
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
      <div
        style={{
          textAlign: 'center',
          transform: `scale(${scale})`,
          opacity,
          maxWidth: '1000px',
        }}
      >
        {/* Main headline with purple gradient */}
        <h1 style={{ margin: '0 0 32px 0' }}>
          <TypewriterText
            text="Stop Losing"
            startFrame={5}
            fontSize="96px"
            useGradient={true} // Purple gradient
            speed={3}
          />
          <br />
          <TypewriterText
            text="Start Winning"
            startFrame={35}
            fontSize="96px"
            useGradient={true} // Purple gradient
            speed={3}
          />
        </h1>

        {/* Subheadline in black */}
        <p style={{ margin: '0 0 48px 0' }}>
          <TypewriterText
            text="Join investment groups and beat the market together"
            startFrame={65}
            fontSize="36px"
            useGradient={false} // Black text
            fontWeight="600"
            speed={4}
          />
        </p>

        {/* Main CTA Button */}
        <div
          style={{
            transform: `scale(${buttonPulse})`,
            marginBottom: '32px',
            opacity: interpolate(frame, [90, 110], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          <div
            style={{
              background: gradients.brand, // Purple gradient button
              borderRadius: '16px',
              padding: '24px 64px',
              display: 'inline-block',
              boxShadow: '0 8px 32px rgba(79, 70, 229, 0.3)',
              cursor: 'pointer',
              border: `2px solid ${colors.primary[400]}`,
            }}
          >
            <p
              style={{
                fontSize: '32px',
                color: 'white',
                margin: 0,
                fontWeight: '700',
              }}
            >
              Join Tickker Free 🚀
            </p>
          </div>
        </div>

        {/* Value props in black text */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '32px',
            marginBottom: '32px',
            flexWrap: 'wrap',
            opacity: interpolate(frame, [110, 130], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          {[
            { icon: '👥', text: 'Join investment groups' },
            { icon: '📊', text: 'Track real performance' },
            { icon: '🏆', text: 'Beat the market together' },
          ].map((prop, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'white',
                padding: '12px 20px',
                borderRadius: '8px',
                border: `1px solid ${colors.slate[200]}`,
                boxShadow: shadows.sm,
              }}
            >
              <span style={{ fontSize: '20px' }}>{prop.icon}</span>
              <span
                style={{
                  fontSize: '16px',
                  color: colors.slate[900], // Black text
                  fontWeight: '500',
                }}
              >
                {prop.text}
              </span>
            </div>
          ))}
        </div>

        {/* Urgency text in black */}
        <div
          style={{
            opacity: urgencyText,
          }}
        >
          <p
            style={{
              fontSize: '20px',
              color: colors.slate[900], // Black text
              margin: '0 0 8px 0',
              fontWeight: '600',
            }}
          >
            Join 1,200+ investors in groups winning together
          </p>
          <p
            style={{
              fontSize: '16px',
              color: colors.slate[600], // Dark gray text
              margin: 0,
              fontWeight: '500',
            }}
          >
            ✨ Upload your portfolio and join a group in under 60 seconds
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};