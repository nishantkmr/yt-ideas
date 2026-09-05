import {Audio, staticFile} from 'remotion';

type VoiceoverProps = {
  asset?: string;
  name: string;
};

export const Voiceover: React.FC<VoiceoverProps> = ({asset, name}) => {
  if (!asset) return null;

  return <Audio name={name} pauseWhenBuffering src={staticFile(asset)} />;
};
