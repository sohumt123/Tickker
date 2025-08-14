import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { colors, gradients, fonts, shadows } from '../DesignSystem';

export const RealPortfolioWeights: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Sample portfolio allocation data
  const allocations = [
    { symbol: 'AAPL', name: 'Apple Inc.', weight: 22.5, value: 45230, color: '#007AFF' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', weight: 18.3, value: 36840, color: '#4285F4' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', weight: 15.7, value: 31580, color: '#00BCF2' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', weight: 12.1, value: 24360, color: '#FF9900' },
    { symbol: 'TSLA', name: 'Tesla Inc.', weight: 9.4, value: 18920, color: '#CC0000' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', weight: 8.8, value: 17720, color: '#76B900' },
    { symbol: 'META', name: 'Meta Platforms', weight: 7.2, value: 14480, color: '#1877F2' },
    { symbol: 'OTHER', name: 'Other Holdings', weight: 6.0, value: 12080, color: colors.slate[400] },
  ];

  // Animation for pie chart segments
  const getSegmentAnimation = (index: number) => {
    const startFrame = index * 6;
    return interpolate(frame, [startFrame, startFrame + 30], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate pie chart segments
  const calculatePieSegments = () => {
    let currentAngle = -90; // Start from top
    return allocations.map((item, index) => {
      const startAngle = currentAngle;
      const endAngle = currentAngle + (item.weight / 100) * 360;
      currentAngle = endAngle;
      
      const progress = getSegmentAnimation(index);
      const animatedEndAngle = startAngle + ((endAngle - startAngle) * progress);
      
      return {
        ...item,
        startAngle,
        endAngle: animatedEndAngle,
        progress,
      };
    });
  };

  const segments = calculatePieSegments();

  // Create SVG path for pie segment
  const createPath = (centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    
    return [
      'M', centerX, centerY,
      'L', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      'Z'
    ].join(' ');
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  return (
    <AbsoluteFill
      style={{
        background: gradients.background,
        padding: '40px',
        fontFamily: fonts.family,
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          border: `1px solid ${colors.slate[200]}`,
          boxShadow: shadows.lg,
          padding: '32px',
          display: 'flex',
          gap: '48px',
        }}
      >
        {/* Left Side - Pie Chart */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2
            style={{
              fontSize: '28px',
              fontWeight: '700',
              color: colors.slate[900],
              margin: '0 0 32px 0',
            }}
          >
            Portfolio Allocation
          </h2>

          <svg width="300" height="300" viewBox="0 0 300 300">
            {segments.map((segment, index) => (
              <path
                key={segment.symbol}
                d={createPath(150, 150, 120, segment.startAngle, segment.endAngle)}
                fill={segment.color}
                stroke="white"
                strokeWidth="2"
                opacity={segment.progress}
              />
            ))}
            
            {/* Center circle */}
            <circle
              cx="150"
              cy="150"
              r="50"
              fill="white"
              stroke={colors.slate[200]}
              strokeWidth="2"
            />
            
            {/* Total Value in Center */}
            <text
              x="150"
              y="140"
              textAnchor="middle"
              fontSize="14"
              fill={colors.slate[600]}
              fontWeight="500"
            >
              Total Value
            </text>
            <text
              x="150"
              y="160"
              textAnchor="middle"
              fontSize="20"
              fill={colors.slate[900]}
              fontWeight="700"
            >
              $201.2K
            </text>
          </svg>
        </div>

        {/* Right Side - Holdings List */}
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: '24px',
              fontWeight: '600',
              color: colors.slate[900],
              margin: '0 0 24px 0',
            }}
          >
            Holdings Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {allocations.map((holding, index) => {
              const animation = getSegmentAnimation(index);
              
              return (
                <div
                  key={holding.symbol}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: `1px solid ${colors.slate[200]}`,
                    opacity: animation,
                    transform: `translateX(${(1 - animation) * 20}px)`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: holding.color,
                        marginRight: '12px',
                      }}
                    />
                    <div>
                      <span
                        style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: colors.slate[900],
                        }}
                      >
                        {holding.symbol}
                      </span>
                      <p
                        style={{
                          fontSize: '14px',
                          color: colors.slate[600],
                          margin: 0,
                        }}
                      >
                        {holding.name}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <p
                      style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: colors.slate[900],
                        margin: 0,
                      }}
                    >
                      {holding.weight}%
                    </p>
                    <p
                      style={{
                        fontSize: '14px',
                        color: colors.slate[600],
                        margin: 0,
                      }}
                    >
                      {formatCurrency(holding.value)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Diversification Score */}
          <div
            style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: colors.primary[50],
              borderRadius: '8px',
              border: `1px solid ${colors.primary[200]}`,
              opacity: interpolate(frame, [60, 80], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colors.primary[800],
                }}
              >
                Diversification Score
              </span>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: colors.primary[700],
                }}
              >
                8.2/10
              </span>
            </div>
            <p
              style={{
                fontSize: '14px',
                color: colors.primary[600],
                margin: '4px 0 0 0',
              }}
            >
              Well-diversified across 8 holdings
            </p>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};