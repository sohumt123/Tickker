import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from 'remotion';

export const SocialProof: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const stats = [
    {
      number: "10,000+",
      label: "Portfolios Tracked",
      color: "#22c55e",
      delay: 0,
    },
    {
      number: "50+",
      label: "Investment Groups",
      color: "#3b82f6", 
      delay: fps * 1,
    },
    {
      number: "85%",
      label: "Users Improve Performance",
      color: "#f59e0b",
      delay: fps * 2,
    },
  ];

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '100px',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: '1200px',
        }}
      >
        <h1
          style={{
            fontSize: '72px',
            color: 'white',
            margin: '0 0 100px 0',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
            opacity: interpolate(frame, [0, 30], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          Join the Movement
        </h1>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            gap: '80px',
          }}
        >
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              number={stat.number}
              label={stat.label}
              color={stat.color}
              delay={stat.delay}
              frame={frame}
            />
          ))}
        </div>

        <div
          style={{
            marginTop: '100px',
            opacity: interpolate(frame, [fps * 3.5, fps * 4.5], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          <p
            style={{
              fontSize: '36px',
              color: '#94a3b8',
              margin: 0,
              fontFamily: 'Arial, sans-serif',
            }}
          >
            "Tickker helped me beat the market for the first time" - Sarah K.
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

interface StatCardProps {
  number: string;
  label: string;
  color: string;
  delay: number;
  frame: number;
}

const StatCard: React.FC<StatCardProps> = ({number, label, color, delay, frame}) => {
  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(frame, [delay, delay + 20], [0.5, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: '20px',
        padding: '60px 40px',
        border: `3px solid ${color}`,
        minWidth: '280px',
      }}
    >
      <h2
        style={{
          fontSize: '96px',
          color: color,
          margin: '0 0 20px 0',
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold',
        }}
      >
        {number}
      </h2>
      <p
        style={{
          fontSize: '32px',
          color: 'white',
          margin: 0,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {label}
      </p>
    </div>
  );
};