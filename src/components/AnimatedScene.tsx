import type {CSSProperties, PropsWithChildren} from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

type AnimatedSceneProps = PropsWithChildren<{
  className?: string;
  durationInFrames?: number;
}>;

export const AnimatedScene: React.FC<AnimatedSceneProps> = ({
  children,
  className = '',
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const entrance = spring({
    fps,
    frame,
    config: {damping: 16, mass: 0.75, stiffness: 115},
  });
  const exit = durationInFrames
    ? interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  const style: CSSProperties = {
    opacity: entrance * exit,
    transform: `translateY(${interpolate(entrance, [0, 1], [42, 0])}px) scale(${interpolate(entrance, [0, 1], [0.96, 1])})`,
  };

  return (
    <div className={`scene ${className}`.trim()} style={style}>
      {children}
    </div>
  );
};
