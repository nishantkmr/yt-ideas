import {Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {musicAssetFor} from '../packs/manifest-registry';
import type {VisualTheme} from '../types/content';

type MusicBedProps = {
  theme: VisualTheme;
};

export const MusicBed: React.FC<MusicBedProps> = ({theme}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();
  const track = musicAssetFor(theme);
  const fadeIn = interpolate(frame, [0, fps * 1.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fps * 1.8, durationInFrames - 1],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  return (
    <Audio
      loop
      name={track.name}
      pauseWhenBuffering
      src={staticFile(track.asset)}
      volume={0.075 * Math.min(fadeIn, fadeOut)}
    />
  );
};
