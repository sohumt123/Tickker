import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from 'remotion';

export const DemoShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const demos = [
    {
      title: "Upload Your Portfolio",
      description: "Simply drag & drop your brokerage CSV file",
      mockup: "📁",
      color: "#3b82f6",
    },
    {
      title: "See Real Performance",
      description: "Beautiful charts comparing you vs SPY & friends",
      mockup: "📈",
      color: "#22c55e",
    },
    {
      title: "Join Investment Groups", 
      description: "Connect with like-minded investors",
      mockup: "👥",
      color: "#f59e0b",
    },
    {
      title: "Compete & Learn",
      description: "Leaderboards, challenges, and insights",
      mockup: "🏆",
      color: "#8b5cf6",
    },
  ];

  const demoDuration = fps * 4; // 4 seconds per demo

  return (
    <AbsoluteFill style={{backgroundColor: '#f1f5f9'}}>
      {demos.map((demo, index) => (
        <Sequence
          key={demo.title}
          from={index * demoDuration}
          durationInFrames={demoDuration}
        >
          <DemoCard
            title={demo.title}
            description={demo.description}
            mockup={demo.mockup}
            color={demo.color}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

interface DemoCardProps {
  title: string;
  description: string;
  mockup: string;
  color: string;
}

const DemoCard: React.FC<DemoCardProps> = ({title, description, mockup, color}) => {
  const frame = useCurrentFrame();

  const slideIn = interpolate(frame, [0, 20], [100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scaleIn = interpolate(frame, [10, 40], [0.8, 1], {
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
          display: 'flex',
          alignItems: 'center',
          gap: '100px',
          transform: `translateX(${slideIn}px) scale(${scaleIn})`,
          opacity: fadeIn,
          maxWidth: '1400px',
          width: '100%',
        }}
      >
        {/* Mockup Side */}
        <div
          style={{
            flex: 1,
            backgroundColor: 'white',
            borderRadius: '30px',
            padding: '80px',
            boxShadow: '0 30px 60px rgba(0,0,0,0.15)',
            border: `4px solid ${color}`,
            textAlign: 'center',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: '200px',
              marginBottom: '40px',
            }}
          >
            {mockup}
          </div>
          
          {/* Mock interface elements */}
          <div
            style={{
              width: '100%',
              height: '20px',
              backgroundColor: color,
              borderRadius: '10px',
              marginBottom: '20px',
              opacity: 0.8,
            }}
          />
          <div
            style={{
              width: '80%',
              height: '15px',
              backgroundColor: '#e2e8f0',
              borderRadius: '8px',
              marginBottom: '15px',
            }}
          />
          <div
            style={{
              width: '60%',
              height: '15px',
              backgroundColor: '#e2e8f0',
              borderRadius: '8px',
            }}
          />
        </div>

        {/* Content Side */}
        <div
          style={{
            flex: 1,
            textAlign: 'left',
          }}
        >
          <h2
            style={{
              fontSize: '72px',
              color: color,
              margin: '0 0 40px 0',
              fontFamily: 'Arial, sans-serif',
              fontWeight: 'bold',
              lineHeight: 1.1,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              fontSize: '42px',
              color: '#475569',
              margin: 0,
              lineHeight: 1.3,
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {description}
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};