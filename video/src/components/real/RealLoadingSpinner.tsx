import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { colors, gradients, fonts, shadows } from '../DesignSystem';

export const RealLoadingSpinner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Spinner rotation
  const rotation = (frame * 6) % 360;

  // Fade in animation
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Processing steps
  const steps = [
    'Parsing CSV file...',
    'Validating transaction data...',
    'Fetching market data...',
    'Calculating performance metrics...',
    'Building comparison charts...',
    'Finalizing dashboard...',
  ];

  const currentStepIndex = Math.floor(interpolate(frame, [20, 140], [0, steps.length], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }));

  const progressPercent = interpolate(frame, [20, 140], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: gradients.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: fonts.family,
        opacity,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '60px',
          borderRadius: '16px',
          boxShadow: shadows.lg,
          textAlign: 'center',
          maxWidth: '500px',
          width: '90%',
          border: `1px solid ${colors.slate[200]}`,
        }}
      >
        {/* Loading Spinner */}
        <div
          style={{
            width: '48px',
            height: '48px',
            border: `4px solid ${colors.slate[200]}`,
            borderTop: `4px solid ${colors.primary[600]}`,
            borderRadius: '50%',
            margin: '0 auto 32px auto',
            transform: `rotate(${rotation}deg)`,
          }}
        />

        {/* Processing Title */}
        <h2
          style={{
            fontSize: '24px',
            fontWeight: '700',
            color: colors.slate[900],
            margin: '0 0 16px 0',
          }}
        >
          Processing Portfolio Data
        </h2>

        {/* Current Step */}
        <p
          style={{
            fontSize: '16px',
            color: colors.slate[600],
            margin: '0 0 32px 0',
            minHeight: '24px',
          }}
        >
          {currentStepIndex < steps.length ? steps[currentStepIndex] : 'Complete!'}
        </p>

        {/* Progress Bar */}
        <div
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: colors.slate[200],
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: `linear-gradient(to right, ${colors.primary[500]}, ${colors.primary[600]})`,
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {/* Progress Percentage */}
        <p
          style={{
            fontSize: '14px',
            color: colors.slate[500],
            margin: '0 0 24px 0',
          }}
        >
          {Math.round(progressPercent)}% complete
        </p>

        {/* Processing Steps List */}
        <div
          style={{
            textAlign: 'left',
            marginTop: '32px',
          }}
        >
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '12px',
                  opacity: isCompleted || isCurrent ? 1 : 0.4,
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: isCompleted 
                      ? colors.success[500] 
                      : isCurrent 
                        ? colors.primary[500] 
                        : colors.slate[300],
                    marginRight: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isCompleted && (
                    <span style={{ color: 'white', fontSize: '10px' }}>✓</span>
                  )}
                  {isCurrent && (
                    <div
                      style={{
                        width: '6px',
                        height: '6px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                      }}
                    />
                  )}
                </div>
                <span
                  style={{
                    fontSize: '14px',
                    color: isCompleted 
                      ? colors.success[700] 
                      : isCurrent 
                        ? colors.primary[700] 
                        : colors.slate[500],
                    fontWeight: isCurrent ? '500' : '400',
                  }}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};