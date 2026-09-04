import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {GuessPicture} from '../questions/GuessPicture';
import {Streak} from './Streak';

type AnswerRevealProps = {
  answer: string;
  explanation: string;
  streak?: number;
  visual?: {
    asset: string;
    alt: string;
  };
};

export const AnswerReveal: React.FC<AnswerRevealProps> = ({
  answer,
  explanation,
  streak,
  visual,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({fps, frame, config: {damping: 12, stiffness: 120}});

  return (
    <div
      className={`answer-reveal ${visual ? 'answer-reveal--with-visual' : ''}`.trim()}
      style={{transform: `scale(${interpolate(pop, [0, 1], [0.86, 1])})`}}
    >
      <div className="celebration-dots" aria-hidden="true">
        <i /><i /><i /><i /><i />
      </div>
      {visual ? <GuessPicture alt={visual.alt} asset={visual.asset} /> : null}
      <div className="answer-copy">
        <div className="eyebrow">Correct answer</div>
        <strong className="answer-word">{answer}</strong>
        <p className="answer-explanation">{explanation}</p>
      </div>
      {streak ? <Streak count={streak} /> : null}
    </div>
  );
};
