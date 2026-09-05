import {Audio, Sequence, staticFile, useVideoConfig} from 'remotion';

type CountdownTicksProps = {
  seconds: number;
};

export const CountdownTicks: React.FC<CountdownTicksProps> = ({seconds}) => {
  const {fps} = useVideoConfig();

  return Array.from({length: seconds}, (_, index) => (
    <Sequence key={index} from={index * fps} durationInFrames={fps}>
      <Audio
        name={`Countdown tick ${index + 1}`}
        src={staticFile('audio/sfx/countdown-tick.wav')}
        volume={0.38}
      />
    </Sequence>
  ));
};
