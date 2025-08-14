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

export const YCSocialProof: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animated counter effect
  const getAnimatedNumber = (target: number, startFrame: number, duration: number) => {
    const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return Math.floor(target * progress);
  };

  const stats = [
    { 
      number: 1200, 
      suffix: '+', 
      label: 'Investors in Groups',
      icon: '👥',
      startFrame: 15,
    },
    { 
      number: 73, 
      suffix: '%', 
      label: 'Beat the Market',
      icon: '🏆',
      startFrame: 25,
    },
    { 
      number: 15, 
      suffix: '+', 
      label: 'Active Communities',
      icon: '💬',
      startFrame: 35,
    },
  ];

  const containerScale = spring({
    frame,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
    },
  });

  return (
    <AbsoluteFill
      style={{
        background: gradients.background, // Consistent light background
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: fonts.family,
        padding: '80px',
      }}
    >
      {/* Main heading with purple gradient */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '60px',
          transform: `scale(${containerScale})`,
          maxWidth: '1000px',
        }}
      >
        <h1 style={{ margin: '0 0 24px 0' }}>
          <TypewriterText
            text="Join the Community"
            startFrame={5}
            fontSize="80px"
            useGradient={true} // Purple gradient
            speed={2}
          />
        </h1>
        <p style={{ margin: 0 }}>
          <TypewriterText
            text="Hundreds of investors winning together in groups"
            startFrame={40}
            fontSize="36px"
            useGradient={false} // Black text
            fontWeight="500"
            speed={3}
          />
        </p>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '48px',
          marginBottom: '40px',
          maxWidth: '900px',
          width: '100%',
        }}
      >
        {stats.map((stat, index) => {
          const animatedNumber = getAnimatedNumber(stat.number, stat.startFrame, 20);
          const cardOpacity = interpolate(frame, [stat.startFrame - 5, stat.startFrame + 10], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          
          const cardSlide = interpolate(frame, [stat.startFrame - 5, stat.startFrame + 15], [30, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <div
              key={index}
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '32px',
                textAlign: 'center',
                boxShadow: shadows.lg,
                border: `2px solid ${colors.primary[200]}`,
                opacity: cardOpacity,
                transform: `translateY(${cardSlide}px)`,
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                {stat.icon}
              </div>
              <h3
                style={{
                  fontSize: '48px',
                  fontWeight: '800',
                  margin: '0 0 8px 0',
                  fontFamily: fonts.mono,
                  ...textStyles.mainTitle, // Purple gradient
                }}
              >
                {animatedNumber.toLocaleString()}{stat.suffix}
              </h3>
              <p
                style={{
                  fontSize: '18px',
                  margin: 0,
                  fontWeight: '500',
                  color: colors.slate[900], // Black text
                }}
              >
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Testimonial */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '32px 48px',
          boxShadow: shadows.lg,
          border: `2px solid ${colors.slate[200]}`,
          maxWidth: '800px',
          textAlign: 'center',
          opacity: interpolate(frame, [fps * 2, fps * 2.5], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>⭐⭐⭐⭐⭐</div>
        <p
          style={{
            fontSize: '28px',
            fontStyle: 'italic',
            margin: '0 0 16px 0',
            lineHeight: 1.4,
            color: colors.slate[900], // Black text
          }}
        >
          "My investment group helped me beat SPY by 6% this year!"
        </p>
        <p
          style={{
            fontSize: '16px',
            margin: 0,
            fontWeight: '500',
            color: colors.slate[600], // Dark gray text
          }}
        >
          — Sarah K., Growth Investors Group
        </p>
      </div>
    </AbsoluteFill>
  );
};