import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from 'remotion';
import { colors, gradients, fonts, shadows } from '../DesignSystem';

export const RealFileUpload: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation phases
  const dragOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dragActive = interpolate(frame, [40, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fileDropped = frame > 70;
  const uploading = frame > 80 && frame < 140;
  const success = frame > 140;

  const uploadProgress = interpolate(frame, [80, 140], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const successScale = spring({
    frame: frame - 140,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
    },
  });

  const getUploadIcon = () => {
    if (success) {
      return (
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: colors.success[500],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${successScale})`,
          }}
        >
          <span style={{ color: 'white', fontSize: '24px' }}>✓</span>
        </div>
      );
    }
    
    if (uploading) {
      return (
        <div
          style={{
            width: '48px',
            height: '48px',
            border: `4px solid ${colors.slate[300]}`,
            borderTop: `4px solid ${colors.slate[600]}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      );
    }

    return (
      <svg
        width={48}
        height={48}
        viewBox="0 0 24 24"
        fill="none"
        stroke={colors.slate[400]}
        strokeWidth={2}
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7,10 12,15 17,10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    );
  };

  const getStatusText = () => {
    if (success) return 'Upload successful! Redirecting...';
    if (uploading) return 'Processing your portfolio data...';
    if (dragActive > 0.5) return 'Drop your CSV file here...';
    return 'Drag & drop your Fidelity CSV file here, or click to browse';
  };

  const getBorderColor = () => {
    if (success) return colors.success[300];
    if (uploading) return colors.primary[300];
    if (dragActive > 0.5) return colors.slate[400];
    return colors.slate[300];
  };

  const getBackgroundColor = () => {
    if (success) return colors.success[50];
    if (uploading) return colors.primary[50];
    if (dragActive > 0.5) return colors.slate[50];
    return 'white';
  };

  return (
    <AbsoluteFill
      style={{
        background: gradients.background,
        padding: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: fonts.family,
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          width: '100%',
        }}
      >
        {/* Upload Area */}
        <div
          style={{
            opacity: dragOpacity,
            border: `2px dashed ${getBorderColor()}`,
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            backgroundColor: getBackgroundColor(),
            cursor: uploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: shadows.sm,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ marginBottom: '24px' }}>
              {getUploadIcon()}
            </div>
            
            <p
              style={{
                fontSize: '18px',
                fontWeight: '500',
                color: colors.slate[700],
                margin: '0 0 8px 0',
                lineHeight: 1.5,
              }}
            >
              {getStatusText()}
            </p>
            
            {fileDropped && !uploading && !success && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '14px',
                  color: colors.slate[500],
                  marginBottom: '16px',
                }}
              >
                <span style={{ marginRight: '8px' }}>📄</span>
                Accounts_History.csv (2.3 KB)
              </div>
            )}
            
            {uploading && (
              <div
                style={{
                  width: '100%',
                  maxWidth: '300px',
                  height: '8px',
                  backgroundColor: colors.slate[200],
                  borderRadius: '4px',
                  marginTop: '16px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${uploadProgress}%`,
                    height: '100%',
                    backgroundColor: colors.primary[600],
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            )}
            
            {!uploading && !success && (
              <p
                style={{
                  fontSize: '14px',
                  color: colors.slate[500],
                  margin: 0,
                }}
              >
                Supports: Fidelity Accounts_History.csv files
              </p>
            )}
          </div>
        </div>
        
        {/* Success Message */}
        {success && (
          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              backgroundColor: colors.success[50],
              border: `1px solid ${colors.success[200]}`,
              borderRadius: '8px',
              opacity: interpolate(frame, [140, 160], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                color: colors.success[700],
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '4px',
              }}
            >
              <span style={{ marginRight: '8px', fontSize: '16px' }}>✓</span>
              Portfolio data processed successfully!
            </div>
            <p
              style={{
                fontSize: '12px',
                color: colors.success[600],
                margin: 0,
              }}
            >
              Your transaction history has been analyzed and is ready for visualization.
            </p>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};