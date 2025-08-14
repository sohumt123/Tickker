import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from 'remotion';

interface TitleSceneProps {
  titleText: string;
  titleColor: string;
  subtitleText: string;
}

export const TitleScene: React.FC<TitleSceneProps> = ({
  titleText,
  titleColor,
  subtitleText,
}) => {
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

  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #22c55e 100%)',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          opacity,
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '120px',
            fontWeight: 'bold',
            color: 'white',
            margin: 0,
            fontFamily: 'Arial, sans-serif',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          {titleText}
        </h1>
        <p
          style={{
            fontSize: '48px',
            color: 'rgba(255,255,255,0.9)',
            margin: '30px 0 50px 0',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          {subtitleText}
        </p>
        
        <div
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            borderRadius: '15px',
            padding: '20px 40px',
            border: '2px solid #22c55e',
            marginTop: '40px',
          }}
        >
          <p
            style={{
              fontSize: '36px',
              color: '#22c55e',
              margin: 0,
              fontFamily: 'Arial, sans-serif',
              fontWeight: 'bold',
            }}
          >
            Where investing meets community
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};