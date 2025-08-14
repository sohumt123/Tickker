import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from 'remotion';
import { YCHook } from '../components/ycstyle/YCHook';
import { YCProblemSolution } from '../components/ycstyle/YCProblemSolution';
import { YCFeatureMontage } from '../components/ycstyle/YCFeatureMontage';
import { YCGroupsShowcase } from '../components/ycstyle/YCGroupsShowcase';
import { YCSocialProof } from '../components/ycstyle/YCSocialProof';
import { YCCallToAction } from '../components/ycstyle/YCCallToAction';

export interface TickkerPromoProps {
  titleText: string;
  titleColor: string;
  subtitleText: string;
}

export const TickkerPromo: React.FC<TickkerPromoProps> = ({
  titleText,
  titleColor,
  subtitleText,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Scene timings (in frames) - Ensure full rendering
  const hookDuration = fps * 9.5; // 9.5 seconds - Extended for full hook reading time
  const problemSolutionDuration = fps * 5; // 5 seconds - Enough time for problem/solution
  const featureMontageeDuration = fps * 9; // 9 seconds - Extended for all 4 features
  const socialProofDuration = fps * 5; // 5 seconds - Full stats and testimonial render
  const ctaDuration = fps * 7; // 7 seconds - Complete CTA with all elements

  return (
    <AbsoluteFill style={{backgroundColor: 'white'}}>
      {/* Hook - Opening attention grabber */}
      <Sequence from={0} durationInFrames={hookDuration}>
        <YCHook />
      </Sequence>

      {/* Problem/Solution */}
      <Sequence from={hookDuration} durationInFrames={problemSolutionDuration}>
        <YCProblemSolution />
      </Sequence>

      {/* Feature Montage */}
      <Sequence from={hookDuration + problemSolutionDuration} durationInFrames={featureMontageeDuration}>
        <YCFeatureMontage />
      </Sequence>

      {/* Groups Showcase */}
      <Sequence from={hookDuration + problemSolutionDuration + featureMontageeDuration} durationInFrames={socialProofDuration}>
        <YCGroupsShowcase />
      </Sequence>

      {/* Social Proof */}
      <Sequence from={hookDuration + problemSolutionDuration + featureMontageeDuration + socialProofDuration} durationInFrames={socialProofDuration}>
        <YCSocialProof />
      </Sequence>

      {/* Call to Action */}
      <Sequence from={hookDuration + problemSolutionDuration + featureMontageeDuration + socialProofDuration * 2} durationInFrames={ctaDuration}>
        <YCCallToAction />
      </Sequence>
    </AbsoluteFill>
  );
};