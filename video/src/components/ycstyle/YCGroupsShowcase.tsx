import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { colors, gradients, fonts, shadows, textStyles } from '../DesignSystem';
import { TypewriterText } from '../shared/TypewriterText';

export const YCGroupsShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fast showcase of 3 key features focusing on groups
  const features = [
    {
      title: "Join Investment Groups",
      subtitle: "Connect with investors who share your goals",
      startFrame: 0,
      duration: fps * 2.5,
      demo: "Groups",
    },
    {
      title: "Track Group Performance",
      subtitle: "See how you rank against your peers",
      startFrame: fps * 2.5,
      duration: fps * 2.5,
      demo: "Leaderboard",
    },
    {
      title: "Learn & Win Together",
      subtitle: "Share strategies and beat the market as a team",
      startFrame: fps * 5,
      duration: fps * 2.5,
      demo: "Community",
    },
  ];

  const renderDemo = (demoType: string, progress: number) => {
    const scale = 1.2;
    
    switch (demoType) {
      case "Groups":
        return (
          <div
            style={{
              transform: `scale(${scale})`,
              display: 'flex',
              gap: '20px',
              justifyContent: 'center',
            }}
          >
            {['Growth Investors', 'Value Hunters', 'Tech Enthusiasts'].map((group, index) => (
              <div
                key={group}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  border: `2px solid ${colors.primary[300]}`,
                  minWidth: '200px',
                  textAlign: 'center',
                  opacity: progress > index * 0.3 ? 1 : 0.3,
                  boxShadow: shadows.md,
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
                <h4 style={{ fontSize: '18px', margin: '0 0 8px 0', color: colors.slate[900], fontWeight: '600' }}>
                  {group}
                </h4>
                <p style={{ fontSize: '14px', color: colors.slate[600], margin: 0 }}>
                  {12 + index * 8} members
                </p>
              </div>
            ))}
          </div>
        );
        
      case "Leaderboard":
        return (
          <div
            style={{
              transform: `scale(${scale})`,
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '32px',
              border: `2px solid ${colors.success[300]}`,
              minWidth: '600px',
              boxShadow: shadows.lg,
            }}
          >
            <h3 style={{ fontSize: '24px', margin: '0 0 24px 0', color: colors.slate[900], textAlign: 'center' }}>
              Group Leaderboard
            </h3>
            {[
              { name: 'You', return: '+28.4%', rank: 2 },
              { name: 'Alex M.', return: '+31.2%', rank: 1 },
              { name: 'Sarah K.', return: '+24.1%', rank: 3 },
            ].map((member, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  marginBottom: '8px',
                  backgroundColor: member.name === 'You' ? colors.primary[50] : colors.slate[50],
                  borderRadius: '8px',
                  border: member.name === 'You' ? `2px solid ${colors.primary[300]}` : '1px solid transparent',
                  opacity: progress > index * 0.3 ? 1 : 0,
                }}
              >
                <span style={{ fontSize: '16px', fontWeight: '600', color: colors.slate[900] }}>
                  #{member.rank} {member.name}
                </span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: colors.success[600] }}>
                  {member.return}
                </span>
              </div>
            ))}
          </div>
        );
        
      case "Community":
        return (
          <div
            style={{
              transform: `scale(${scale})`,
              display: 'flex',
              gap: '24px',
              alignItems: 'center',
            }}
          >
            {/* Chat mockup */}
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '24px',
                border: `2px solid ${colors.slate[300]}`,
                minWidth: '300px',
                boxShadow: shadows.md,
              }}
            >
              <h4 style={{ fontSize: '18px', margin: '0 0 16px 0', color: colors.slate[900] }}>
                💬 Group Chat
              </h4>
              {[
                { user: 'Alex', msg: 'Just bought more AAPL!' },
                { user: 'You', msg: 'Nice! I\'m up 8% this month' },
                { user: 'Sarah', msg: 'Check out my analysis 📊' },
              ].map((chat, index) => (
                <div
                  key={index}
                  style={{
                    opacity: progress > index * 0.3 ? 1 : 0,
                    marginBottom: '8px',
                    padding: '8px',
                    backgroundColor: chat.user === 'You' ? colors.primary[100] : colors.slate[100],
                    borderRadius: '8px',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: '600', color: colors.slate[700] }}>
                    {chat.user}:
                  </span>
                  <span style={{ fontSize: '12px', color: colors.slate[600], marginLeft: '4px' }}>
                    {chat.msg}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Performance boost */}
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '32px',
                border: `2px solid ${colors.success[300]}`,
                textAlign: 'center',
                minWidth: '250px',
                boxShadow: shadows.md,
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📈</div>
              <h4 style={{ fontSize: '20px', margin: '0 0 8px 0', color: colors.slate[900] }}>
                Group Boost
              </h4>
              <p style={{ fontSize: '32px', fontWeight: '700', color: colors.success[600], margin: 0 }}>
                +6.3%
              </p>
              <p style={{ fontSize: '14px', color: colors.slate[600], margin: '4px 0 0 0' }}>
                vs individual investing
              </p>
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
        background: gradients.background, // Consistent light background
        fontFamily: fonts.family,
        padding: '80px',
      }}
    >
      {features.map((feature, index) => {
        const isActive = frame >= feature.startFrame && frame < (feature.startFrame + feature.duration);
        if (!isActive) return null;

        const featureFrame = frame - feature.startFrame;
        const progress = Math.min(featureFrame / (feature.duration * 0.8), 1);
        
        const opacity = interpolate(featureFrame, [0, 8, feature.duration - 8, feature.duration], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        const slideY = interpolate(featureFrame, [0, 12], [20, 0], {
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
              padding: '80px',
            }}
          >
            {/* Feature title with purple gradient */}
            <div style={{ textAlign: 'center', marginBottom: '20px', maxWidth: '1000px' }}>
              <h2 style={{ margin: '0 0 16px 0' }}>
                <TypewriterText
                  text={feature.title}
                  startFrame={feature.startFrame + 5}
                  fontSize="80px"
                  useGradient={true} // Purple gradient
                  speed={5}
                />
              </h2>
              <p style={{ margin: 0 }}>
                <TypewriterText
                  text={feature.subtitle}
                  startFrame={feature.startFrame + 20}
                  fontSize="36px"
                  useGradient={false} // Black text
                  fontWeight="500"
                  speed={6}
                />
              </p>
            </div>

            {/* Feature demo */}
            <div>
              {renderDemo(feature.demo, progress)}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};