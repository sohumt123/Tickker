import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from 'remotion';
import { colors, gradients, fonts, shadows } from '../DesignSystem';
import { TypewriterText } from '../shared/TypewriterText';

export const YCFeatureMontage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Feature showcases with extended timing for full rendering
  const features = [
    {
      title: "Upload & Analyze",
      subtitle: "Drag. Drop. Done.",
      demo: "FileUpload",
      startFrame: 0,
      duration: fps * 2.2,
    },
    {
      title: "Beat the Market",
      subtitle: "See exactly how you perform vs SPY",
      demo: "GrowthChart",
      startFrame: fps * 2.2,
      duration: fps * 2.3,
    },
    {
      title: "Track Everything",
      subtitle: "Performance metrics that matter",
      demo: "Metrics",
      startFrame: fps * 4.5,
      duration: fps * 2.2,
    },
    {
      title: "Know Your Portfolio",
      subtitle: "Allocation breakdown at a glance",
      demo: "Allocation",
      startFrame: fps * 6.7,
      duration: fps * 2.3,
    },
  ];

  const renderFeatureDemo = (demo: string, progress: number) => {
    const scale = 1.2; // Make components larger to fill 80% of screen
    
    switch (demo) {
      case "FileUpload":
        return (
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'center',
            }}
          >
            <div
              style={{
                border: `2px dashed ${colors.primary[300]}`,
                borderRadius: '12px',
                padding: '40px',
                backgroundColor: colors.primary[50],
                textAlign: 'center',
                width: '400px',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>📁</div>
              <p style={{ fontSize: '16px', color: colors.slate[600], margin: 0 }}>
                Accounts_History.csv
              </p>
            </div>
          </div>
        );
        
      case "GrowthChart":
        return (
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'center',
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                border: `1px solid ${colors.slate[200]}`,
                width: '500px',
                height: '300px',
                boxShadow: shadows.lg,
              }}
            >
              <svg width="100%" height="200" viewBox="0 0 400 150">
                {/* Portfolio line */}
                <path
                  d="M0,120 Q100,100 200,80 T400,40"
                  fill="none"
                  stroke={colors.primary[600]}
                  strokeWidth="3"
                  strokeDasharray={`${progress * 400} 400`}
                />
                {/* SPY line */}
                <path
                  d="M0,120 Q100,110 200,100 T400,70"
                  fill="none"
                  stroke={colors.slate[400]}
                  strokeWidth="2"
                  strokeDasharray="8 4"
                  strokeDashoffset={`${(1 - progress) * 400}`}
                />
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', color: colors.slate[600], margin: 0 }}>Portfolio</p>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: colors.success[600], margin: 0 }}>+28.4%</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', color: colors.slate[600], margin: 0 }}>SPY</p>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: colors.slate[600], margin: 0 }}>+22.1%</p>
                </div>
              </div>
            </div>
          </div>
        );
        
      case "Metrics":
        return (
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'center',
              display: 'flex',
              gap: '16px',
            }}
          >
            {['1M', '3M', '6M', '1Y'].map((period, index) => (
              <div
                key={period}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '16px',
                  border: `2px solid ${colors.success[200]}`,
                  backgroundColor: colors.success[25],
                  textAlign: 'center',
                  minWidth: '80px',
                  opacity: progress > index * 0.25 ? 1 : 0.3,
                }}
              >
                <p style={{ fontSize: '12px', color: colors.slate[600], margin: 0 }}>{period}</p>
                <p style={{ fontSize: '16px', fontWeight: '700', color: colors.success[600], margin: 0 }}>+{2 + index}%</p>
              </div>
            ))}
          </div>
        );
        
      case "Allocation":
        return (
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'center',
              display: 'flex',
              alignItems: 'center',
              gap: '32px',
            }}
          >
            {/* Mini pie chart */}
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill={colors.primary[500]} strokeDasharray={`${progress * 157} 157`} transform="rotate(-90 60 60)" />
              <circle cx="60" cy="60" r="50" fill={colors.success[500]} strokeDasharray={`${progress * 94} 94`} strokeDashoffset="-157" transform="rotate(-90 60 60)" />
              <circle cx="60" cy="60" r="50" fill={colors.slate[400]} strokeDasharray={`${progress * 63} 63`} strokeDashoffset="-251" transform="rotate(-90 60 60)" />
            </svg>
            
            {/* Holdings list */}
            <div>
              {['AAPL 22.5%', 'GOOGL 18.3%', 'MSFT 15.7%'].map((holding, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '8px',
                    opacity: progress > index * 0.3 ? 1 : 0,
                  }}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: [colors.primary[500], colors.success[500], colors.slate[400]][index],
                      marginRight: '8px',
                    }}
                  />
                  <span style={{ fontSize: '14px', color: colors.slate[700] }}>{holding}</span>
                </div>
              ))}
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <AbsoluteFill
      style={{
        background: gradients.background,
        fontFamily: fonts.family,
      }}
    >
      {features.map((feature, index) => {
        const isActive = frame >= feature.startFrame && frame < (feature.startFrame + feature.duration);
        if (!isActive) return null;

        const featureFrame = frame - feature.startFrame;
        const progress = Math.min(featureFrame / feature.duration, 1);
        
        const opacity = interpolate(featureFrame, [0, 10, feature.duration - 10, feature.duration], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        const slideY = interpolate(featureFrame, [0, 15], [30, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '40px',
              opacity,
              transform: `translateY(${slideY}px)`,
            }}
          >
            {/* Feature title */}
            <div style={{ textAlign: 'center' }}>
              <h2
                style={{
                  fontSize: '56px',
                  fontWeight: '800',
                  color: colors.slate[900],
                  margin: '0 0 8px 0',
                  background: gradients.brand,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {feature.title}
              </h2>
              <p
                style={{
                  fontSize: '24px',
                  color: colors.slate[600],
                  margin: 0,
                  fontWeight: '500',
                }}
              >
                {feature.subtitle}
              </p>
            </div>

            {/* Feature demo */}
            <div>
              {renderFeatureDemo(feature.demo, progress)}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};