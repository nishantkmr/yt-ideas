import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 3900], [-18, 22], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill className="background">
      <div className="background-pattern" />
      <div className="background-orbit background-orbit--one" style={{transform: `translate(${drift}px, ${drift * -0.45}px)`}} />
      <div className="background-orbit background-orbit--two" style={{transform: `translate(${drift * -0.7}px, ${drift * 0.35}px)`}} />
    </AbsoluteFill>
  );
};
