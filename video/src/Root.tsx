import React from 'react';
import {Composition} from 'remotion';
import {TickkerPromo} from './compositions/TickkerPromo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TickkerPromo"
        component={TickkerPromo}
        durationInFrames={1065} // 35.5 seconds at 30fps (9.5+5+9+5+7)
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          titleText: 'Tickker',
          titleColor: '#0f172a',
          subtitleText: 'Social Investment Platform'
        }}
      />
    </>
  );
};