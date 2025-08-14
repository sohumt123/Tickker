import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from 'remotion';

export const Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
      mass: 0.5,
    },
  });

  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const contentOpacity = interpolate(frame, [30, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const logoScale = interpolate(frame, [60, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '100px',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          transform: `scale(${scale})`,
        }}
      >
        <h1
          style={{
            fontSize: '96px',
            fontWeight: 'bold',
            color: '#22c55e',
            margin: '0 0 60px 0',
            fontFamily: 'Arial, sans-serif',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            opacity: titleOpacity,
          }}
        >
          Meet Tickker
        </h1>
        
        <div
          style={{
            opacity: contentOpacity,
            maxWidth: '900px',
            margin: '0 auto',
          }}
        >
          <p
            style={{
              fontSize: '56px',
              color: 'white',
              margin: '0 0 40px 0',
              fontFamily: 'Arial, sans-serif',
              lineHeight: 1.2,
            }}
          >
            The social investment platform that turns portfolio tracking into community building
          </p>
          
          <div
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              borderRadius: '20px',
              padding: '40px',
              border: '2px solid #22c55e',
              transform: `scale(${logoScale})`,
            }}
          >
            <p
              style={{
                fontSize: '42px',
                color: '#22c55e',
                margin: 0,
                fontFamily: 'Arial, sans-serif',
                fontWeight: 'bold',
              }}
            >
              📊 Track • 👥 Connect • 🏆 Compete • 💡 Learn
            </p>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};