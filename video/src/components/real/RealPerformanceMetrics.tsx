import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { colors, gradients, fonts, shadows } from '../DesignSystem';

export const RealPerformanceMetrics: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Sample performance data
  const metricsData = {
    '1M': { portfolio: 3.2, spy: 1.8, outperformance: 1.4 },
    '3M': { portfolio: 8.7, spy: 6.1, outperformance: 2.6 },
    '6M': { portfolio: 15.3, spy: 12.8, outperformance: 2.5 },
    '1Y': { portfolio: 28.4, spy: 22.1, outperformance: 6.3 },
  };

  const periods = [
    { key: '1M', label: '1 Month', icon: '📅' },
    { key: '3M', label: '3 Months', icon: '🎯' },
    { key: '6M', label: '6 Months', icon: '📊' },
    { key: '1Y', label: '1 Year', icon: '🏆' },
  ];

  // Staggered animation for cards
  const getCardAnimation = (index: number) => {
    const startFrame = index * 8;
    return {
      opacity: interpolate(frame, [startFrame, startFrame + 20], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }),
      translateY: interpolate(frame, [startFrame, startFrame + 20], [30, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }),
    };
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Get performance color
  const getPerformanceColor = (value: number) => {
    return value >= 0 ? colors.success[600] : colors.danger[600];
  };

  // Get background color for outperformance
  const getPerformanceBackground = (outperformance: number) => {
    if (outperformance > 2) return `border-${colors.success[300]} bg-${colors.success[50]}`;
    if (outperformance > 0) return `border-${colors.success[200]} bg-${colors.success[25]}`;
    return `border-${colors.danger[200]} bg-${colors.danger[25]}`;
  };

  const summaryAnimation = interpolate(frame, [60, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

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
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h2
            style={{
              fontSize: '28px',
              fontWeight: '700',
              color: colors.slate[900],
              margin: '0 0 8px 0',
            }}
          >
            Performance vs SPY
          </h2>
          <p
            style={{
              fontSize: '16px',
              color: colors.slate[600],
              margin: 0,
            }}
          >
            Compare your portfolio returns against the S&P 500
          </p>
        </div>

        {/* Performance Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: '20px',
            marginBottom: '32px',
          }}
        >
          {periods.map((period, index) => {
            const animation = getCardAnimation(index);
            const metric = metricsData[period.key as keyof typeof metricsData];
            const isOutperforming = metric.outperformance > 0;

            return (
              <div
                key={period.key}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  border: `2px solid ${isOutperforming ? colors.success[200] : colors.danger[200]}`,
                  padding: '24px',
                  boxShadow: shadows.sm,
                  opacity: animation.opacity,
                  transform: `translateY(${animation.translateY}px)`,
                  ...(isOutperforming 
                    ? { backgroundColor: colors.success[25] }
                    : { backgroundColor: colors.danger[25] }
                  )
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{period.icon}</span>
                  <span style={{ fontSize: '24px' }}>
                    {isOutperforming ? '📈' : '📉'}
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: colors.slate[900],
                    margin: '0 0 16px 0',
                  }}
                >
                  {period.label}
                </h3>

                {/* Metrics */}
                <div style={{ marginBottom: '12px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '14px',
                        color: colors.slate[600],
                      }}
                    >
                      Portfolio:
                    </span>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: getPerformanceColor(metric.portfolio),
                      }}
                    >
                      {formatPercentage(metric.portfolio)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '14px',
                        color: colors.slate[600],
                      }}
                    >
                      SPY:
                    </span>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: getPerformanceColor(metric.spy),
                      }}
                    >
                      {formatPercentage(metric.spy)}
                    </span>
                  </div>

                  <div
                    style={{
                      borderTop: `1px solid ${colors.slate[200]}`,
                      paddingTop: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: colors.slate[700],
                        }}
                      >
                        Outperformance:
                      </span>
                      <span
                        style={{
                          fontSize: '16px',
                          fontWeight: '700',
                          color: getPerformanceColor(metric.outperformance),
                        }}
                      >
                        {formatPercentage(metric.outperformance)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Section */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: `1px solid ${colors.slate[200]}`,
            padding: '24px',
            opacity: summaryAnimation,
            transform: `translateY(${(1 - summaryAnimation) * 20}px)`,
          }}
        >
          <h3
            style={{
              fontSize: '20px',
              fontWeight: '600',
              color: colors.slate[900],
              margin: '0 0 20px 0',
            }}
          >
            Performance Summary
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '24px',
              textAlign: 'center',
            }}
          >
            {/* Periods Outperforming */}
            <div>
              <p
                style={{
                  fontSize: '14px',
                  color: colors.slate[600],
                  margin: '0 0 8px 0',
                }}
              >
                Periods Outperforming
              </p>
              <p
                style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: colors.success[600],
                  margin: '0 0 4px 0',
                }}
              >
                4
              </p>
              <p
                style={{
                  fontSize: '14px',
                  color: colors.slate[500],
                  margin: 0,
                }}
              >
                out of 4
              </p>
            </div>

            {/* Average Outperformance */}
            <div>
              <p
                style={{
                  fontSize: '14px',
                  color: colors.slate[600],
                  margin: '0 0 8px 0',
                }}
              >
                Average Outperformance
              </p>
              <p
                style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: colors.success[600],
                  margin: '0 0 4px 0',
                }}
              >
                +3.2%
              </p>
              <p
                style={{
                  fontSize: '14px',
                  color: colors.slate[500],
                  margin: 0,
                }}
              >
                across all periods
              </p>
            </div>

            {/* Consistency Score */}
            <div>
              <p
                style={{
                  fontSize: '14px',
                  color: colors.slate[600],
                  margin: '0 0 8px 0',
                }}
              >
                Consistency Score
              </p>
              <p
                style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: colors.slate[900],
                  margin: '0 0 4px 0',
                }}
              >
                100%
              </p>
              <p
                style={{
                  fontSize: '14px',
                  color: colors.slate[500],
                  margin: 0,
                }}
              >
                outperformance rate
              </p>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};