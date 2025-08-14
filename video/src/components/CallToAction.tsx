import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from 'remotion';
import { colors, gradients, fonts, shadows } from './DesignSystem';

export const CallToAction: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
    },
  });

  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: gradients.background,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: fonts.family,
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          borderRadius: '20px',
          border: `1px solid ${colors.slate[200]}`,
          boxShadow: shadows.lg,
          padding: '60px 80px',
          textAlign: 'center',
          maxWidth: '800px',
          transform: `scale(${scale})`,
          opacity,
        }}
      >
        <h1
          style={{
            fontSize: '56px',
            fontWeight: '700',
            color: colors.slate[900],
            margin: '0 0 24px 0',
            background: gradients.brand,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Start Your Investment Journey
        </h1>
        <p
          style={{
            fontSize: '24px',
            color: colors.slate[600],
            margin: '0 0 32px 0',
            lineHeight: 1.5,
          }}
        >
          Join thousands of investors tracking performance, 
          <br />connecting with peers, and beating the market together.
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '32px' }}>
          {['📊 Track Performance', '👥 Join Groups', '🏆 Compete & Learn'].map((feature, index) => (
            <div
              key={index}
              style={{
                padding: '12px 20px',
                backgroundColor: colors.primary[50],
                borderRadius: '8px',
                border: `1px solid ${colors.primary[200]}`,
                fontSize: '16px',
                color: colors.primary[700],
                fontWeight: '500',
              }}
            >
              {feature}
            </div>
          ))}
        </div>
        
        <div
          style={{
            background: gradients.brand,
            borderRadius: '12px',
            padding: '20px 48px',
            display: 'inline-block',
            boxShadow: shadows.md,
            cursor: 'pointer',
          }}
        >
          <p
            style={{
              fontSize: '24px',
              color: 'white',
              margin: 0,
              fontWeight: '700',
            }}
          >
            Get Started Free →
          </p>
        </div>
        
        <p
          style={{
            fontSize: '16px',
            color: colors.slate[500],
            margin: '24px 0 0 0',
          }}
        >
          No credit card required • Privacy-first • Works with any brokerage
        </p>
      </div>
    </AbsoluteFill>
  );
};