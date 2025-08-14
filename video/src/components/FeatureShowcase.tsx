import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from 'remotion';

export const FeatureShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Feature showcase scenes (4 features, 5 seconds each)
  const featureDuration = fps * 5;

  const features = [
    {
      title: '📊 Portfolio Analytics',
      description: 'Track your investments vs SPY with beautiful charts',
      color: '#22c55e',
    },
    {
      title: '👥 Investment Groups',
      description: 'Join communities and compete with friends',
      color: '#3b82f6',
    },
    {
      title: '🏆 Performance Leaderboards',
      description: 'See how you rank against other investors',
      color: '#f59e0b',
    },
    {
      title: '🔍 Smart Research',
      description: 'Discover insights and investment opportunities',
      color: '#8b5cf6',
    },
  ];

  return (
    <AbsoluteFill style={{backgroundColor: '#f8fafc'}}>
      {features.map((feature, index) => (
        <Sequence
          key={feature.title}
          from={index * featureDuration}
          durationInFrames={featureDuration}
        >
          <FeatureCard
            title={feature.title}
            description={feature.description}
            color={feature.color}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

interface FeatureCardProps {
  title: string;
  description: string;
  color: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({title, description, color}) => {
  const frame = useCurrentFrame();

  const slideIn = interpolate(frame, [0, 20], [-200, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: '100px',
      }}
    >
      <div
        style={{
          transform: `translateX(${slideIn}px)`,
          opacity: fadeIn,
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '60px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          textAlign: 'center',
          border: `4px solid ${color}`,
          maxWidth: '800px',
        }}
      >
        <h2
          style={{
            fontSize: '72px',
            color: color,
            margin: '0 0 30px 0',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: '36px',
            color: '#64748b',
            margin: 0,
            lineHeight: 1.4,
            fontFamily: 'Arial, sans-serif',
          }}
        >
          {description}
        </p>
      </div>
    </AbsoluteFill>
  );
};