import {Img, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

type MascotProps = {
  compact?: boolean;
  message?: string;
};

export const Mascot: React.FC<MascotProps> = ({compact = false, message}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const entrance = spring({fps, frame, config: {damping: 12, stiffness: 105}});
  const bob = Math.sin(frame / 12) * 7;

  return (
    <div
      className={`mascot ${compact ? 'mascot--compact' : ''}`.trim()}
      style={{transform: `translateY(${bob}px) scale(${entrance})`}}
    >
      {message ? <div className="mascot-message">{message}</div> : null}
      <Img className="mascot-image" src={staticFile('assets/quiz-owl.png')} />
    </div>
  );
};
