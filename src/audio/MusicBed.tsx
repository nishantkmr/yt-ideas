import {Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {VisualTheme} from '../types/content';

const MUSIC_BY_THEME: Record<VisualTheme, {asset: string; name: string}> = {
  jungle: {asset: 'audio/music/jungle.wav', name: 'Jungle music bed'},
  cosmic: {asset: 'audio/music/cosmic.wav', name: 'Cosmic music bed'},
  ocean: {asset: 'audio/music/ocean.wav', name: 'Ocean music bed'},
  atlas: {asset: 'audio/music/atlas.wav', name: 'Atlas music bed'},
  workshop: {asset: 'audio/music/workshop.wav', name: 'Workshop music bed'},
  'body-lab': {asset: 'audio/music/body-lab.wav', name: 'Body lab music bed'},
};

type MusicBedProps = {
  theme: VisualTheme;
};

export const MusicBed: React.FC<MusicBedProps> = ({theme}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();
  const track = MUSIC_BY_THEME[theme];
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
