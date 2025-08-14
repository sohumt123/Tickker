import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { colors, gradients, fonts, textStyles } from '../DesignSystem';

interface TypewriterTextProps {
  text: string;
  startFrame: number;
  fontSize?: string;
  color?: string;
  useGradient?: boolean;
  fontWeight?: string;
  style?: React.CSSProperties;
  speed?: number; // characters per frame
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  startFrame,
  fontSize = '48px',
  color = colors.slate[900], // Default to black for subtitles
  useGradient = true,
  fontWeight = '800',
  style = {},
  speed = 3, // 3 characters per frame = very fast
}) => {
  const frame = useCurrentFrame();
  
  // Calculate how many characters to show
  const charsToShow = Math.floor(
    interpolate(frame, [startFrame, startFrame + text.length / speed], [0, text.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  
  const visibleText = text.substring(0, charsToShow);
  
  // Cursor blink effect
  const showCursor = frame >= startFrame && charsToShow < text.length;
  const cursorOpacity = Math.floor((frame - startFrame) / 10) % 2; // Blink every 10 frames
  
  const textStyle: React.CSSProperties = {
    fontSize,
    fontWeight,
    fontFamily: fonts.family,
    margin: 0,
    lineHeight: 1.1,
    ...style,
  };
  
  if (useGradient) {
    // Always use purple gradient for bold text
    Object.assign(textStyle, textStyles.mainTitle);
  } else {
    // Always use black for subtext
    Object.assign(textStyle, textStyles.subtitle);
    textStyle.color = color;
  }
  
  return (
    <span style={textStyle}>
      {visibleText}
      {showCursor && (
        <span 
          style={{ 
            opacity: cursorOpacity,
            color: useGradient ? colors.primary[500] : color,
          }}
        >
          |
        </span>
      )}
    </span>
  );
};