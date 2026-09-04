import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

type CountdownProps = {value: number};

export const Countdown: React.FC<CountdownProps> = ({value}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tickFrame = frame % fps;
  const pop = spring({fps, frame: tickFrame, config: {damping: 11, stiffness: 180}});

  return (
    <div
      className="countdown"
      aria-label={`${value} seconds`}
      style={{transform: `scale(${interpolate(pop, [0, 1], [0.82, 1])})`}}
    >
      {value}
    </div>
  );
};
