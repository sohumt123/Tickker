import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from 'remotion';

export const ProblemStatement: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const problems = [
    {
      text: "Most investors lose to the market",
      detail: "70% of retail investors underperform the S&P 500",
      delay: 0,
    },
    {
      text: "Investing feels lonely and overwhelming",
      detail: "No community support or guidance",
      delay: fps * 2.5,
    },
    {
      text: "Hard to track real performance",
      detail: "Confusing interfaces and scattered data",
      delay: fps * 5,
    },
  ];

  return (
    <AbsoluteFill style={{backgroundColor: '#1e293b'}}>
      <div
        style={{
          padding: '100px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          height: '100%',
        }}
      >
        <h1
          style={{
            fontSize: '72px',
            color: '#ef4444',
            margin: '0 0 80px 0',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
            opacity: interpolate(frame, [0, 30], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          The Problem
        </h1>
        
        {problems.map((problem, index) => (
          <ProblemItem
            key={index}
            text={problem.text}
            detail={problem.detail}
            delay={problem.delay}
            frame={frame}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

interface ProblemItemProps {
  text: string;
  detail: string;
  delay: number;
  frame: number;
}

const ProblemItem: React.FC<ProblemItemProps> = ({text, detail, delay, frame}) => {
  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slideIn = interpolate(frame, [delay, delay + 20], [50, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${slideIn}px)`,
        marginBottom: '60px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: '15px',
        padding: '40px',
        maxWidth: '800px',
        width: '100%',
        border: '2px solid rgba(239, 68, 68, 0.3)',
      }}
    >
      <h2
        style={{
          fontSize: '48px',
          color: 'white',
          margin: '0 0 20px 0',
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold',
        }}
      >
        {text}
      </h2>
      <p
        style={{
          fontSize: '32px',
          color: '#94a3b8',
          margin: 0,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {detail}
      </p>
    </div>
  );
};