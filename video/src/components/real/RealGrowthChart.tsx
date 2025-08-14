import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { colors, gradients, fonts, shadows, chartColors } from '../DesignSystem';

export const RealGrowthChart: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Sample data mimicking real portfolio performance
  const portfolioData = [
    10000, 10200, 9800, 10500, 11200, 10800, 11500, 12100, 11900, 12800, 13200, 12900, 13600, 14100, 13800, 14500
  ];
  
  const spyData = [
    10000, 10100, 9900, 10300, 10800, 10600, 11000, 11400, 11200, 11800, 12000, 11700, 12200, 12600, 12400, 12800
  ];

  const labels = [
    'Jan 2023', 'Feb 2023', 'Mar 2023', 'Apr 2023', 'May 2023', 'Jun 2023',
    'Jul 2023', 'Aug 2023', 'Sep 2023', 'Oct 2023', 'Nov 2023', 'Dec 2023',
    'Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024'
  ];

  // Animation for chart reveal
  const chartReveal = interpolate(frame, [0, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Animation for metrics reveal
  const metricsReveal = interpolate(frame, [40, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Animation for data line drawing
  const lineProgress = interpolate(frame, [20, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Calculate current portfolio value and metrics
  const currentPortfolio = portfolioData[portfolioData.length - 1];
  const currentSpy = spyData[spyData.length - 1];
  const portfolioReturn = ((currentPortfolio - 10000) / 10000) * 100;
  const spyReturn = ((currentSpy - 10000) / 10000) * 100;
  const outperformance = portfolioReturn - spyReturn;

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Draw chart lines
  const drawChartLine = (data: number[], color: string, strokeWidth: number, isDashed = false) => {
    const width = 700;
    const height = 300;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const maxValue = Math.max(...portfolioData, ...spyData);
    const minValue = Math.min(...portfolioData, ...spyData);
    const valueRange = maxValue - minValue;
    
    let pathD = '';
    const visiblePoints = Math.floor(data.length * lineProgress);
    
    for (let i = 0; i < visiblePoints; i++) {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((data[i] - minValue) / valueRange) * chartHeight;
      
      if (i === 0) {
        pathD += `M ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
      }
    }
    
    return (
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={isDashed ? '8 4' : 'none'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };

  return (
    <AbsoluteFill
      style={{
        background: gradients.background,
        padding: '40px',
        fontFamily: fonts.family,
      }}
    >
      {/* Card Container */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          border: `1px solid ${colors.slate[200]}`,
          boxShadow: shadows.lg,
          padding: '32px',
          opacity: chartReveal,
          transform: `translateY(${(1 - chartReveal) * 20}px)`,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '32px',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: '700',
                color: colors.slate[900],
                margin: '0 0 8px 0',
              }}
            >
              Growth of $10,000
            </h2>
            <p
              style={{
                fontSize: '16px',
                color: colors.slate[600],
                margin: 0,
              }}
            >
              Compare your portfolio performance with SPY
            </p>
          </div>

          {/* Time Range Selector */}
          <div
            style={{
              display: 'flex',
              backgroundColor: colors.primary[50],
              padding: '4px',
              borderRadius: '8px',
              border: `1px solid ${colors.primary[200]}`,
            }}
          >
            {['1M', '3M', '6M', '1Y', '2Y', 'MAX'].map((range, index) => (
              <button
                key={range}
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: range === '1Y' ? colors.primary[600] : 'transparent',
                  color: range === '1Y' ? 'white' : colors.primary[700],
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Area */}
        <div
          style={{
            position: 'relative',
            height: '300px',
            marginBottom: '32px',
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            border: `1px solid ${colors.slate[100]}`,
          }}
        >
          {/* Chart SVG */}
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 700 300"
            style={{ overflow: 'visible' }}
          >
            {/* Grid Lines */}
            <defs>
              <pattern id="grid" width="70" height="30" patternUnits="userSpaceOnUse">
                <path
                  d="M 70 0 L 0 0 0 30"
                  fill="none"
                  stroke={colors.slate[200]}
                  strokeWidth="0.5"
                  opacity="0.3"
                />
              </pattern>
            </defs>
            <rect width="700" height="300" fill="url(#grid)" />

            {/* Chart Lines */}
            {drawChartLine(spyData, chartColors.spy, 2, true)}
            {drawChartLine(portfolioData, chartColors.portfolio, 3)}

            {/* Legend */}
            <g transform="translate(500, 20)">
              <circle cx="0" cy="0" r="6" fill={chartColors.portfolio} />
              <text x="15" y="5" fontSize="14" fill={colors.slate[600]} fontWeight="500">
                Your Portfolio
              </text>
              <circle cx="0" cy="25" r="6" fill={chartColors.spy} />
              <text x="15" y="30" fontSize="14" fill={colors.slate[600]} fontWeight="500">
                SPY (S&P 500)
              </text>
            </g>
          </svg>
        </div>

        {/* Metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '24px',
            paddingTop: '24px',
            borderTop: `1px solid ${colors.slate[200]}`,
            opacity: metricsReveal,
            transform: `translateY(${(1 - metricsReveal) * 10}px)`,
          }}
        >
          {/* Portfolio Value */}
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: '14px',
                color: colors.slate[600],
                margin: '0 0 8px 0',
              }}
            >
              Portfolio Value
            </p>
            <p
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: colors.slate[900],
                margin: '0 0 4px 0',
              }}
            >
              {formatCurrency(currentPortfolio)}
            </p>
            <p
              style={{
                fontSize: '14px',
                color: portfolioReturn >= 0 ? colors.success[600] : colors.danger[600],
                margin: 0,
              }}
            >
              {portfolioReturn >= 0 ? '+' : ''}{portfolioReturn.toFixed(2)}%
            </p>
          </div>

          {/* SPY Value */}
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: '14px',
                color: colors.slate[600],
                margin: '0 0 8px 0',
              }}
            >
              SPY Value
            </p>
            <p
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: colors.slate[900],
                margin: '0 0 4px 0',
              }}
            >
              {formatCurrency(currentSpy)}
            </p>
            <p
              style={{
                fontSize: '14px',
                color: spyReturn >= 0 ? colors.success[600] : colors.danger[600],
                margin: 0,
              }}
            >
              {spyReturn >= 0 ? '+' : ''}{spyReturn.toFixed(2)}%
            </p>
          </div>

          {/* Outperformance */}
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: '14px',
                color: colors.slate[600],
                margin: '0 0 8px 0',
              }}
            >
              Outperformance
            </p>
            <p
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: outperformance >= 0 ? colors.success[600] : colors.danger[600],
                margin: '0 0 4px 0',
              }}
            >
              {outperformance >= 0 ? '+' : ''}{outperformance.toFixed(2)}%
            </p>
            <p
              style={{
                fontSize: '14px',
                color: colors.slate[500],
                margin: 0,
              }}
            >
              vs SPY
            </p>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};