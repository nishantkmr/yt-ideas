import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {AnswerVisual} from './AnswerVisual';
import {Streak} from './Streak';
import type {Layout, QuizVisual} from '../types/content';

type AnswerRevealProps = {
  answer: string;
  explanation: string;
  streak?: number;
  visual?: QuizVisual;
  correctOrder?: string[];
  orderedAnswerLabel?: string;
  layout?: Layout;
};

export const AnswerReveal: React.FC<AnswerRevealProps> = ({
  answer,
  explanation,
  streak,
  visual,
  correctOrder,
  orderedAnswerLabel = 'Correct order',
  layout = 'landscape',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({fps, frame, config: {damping: 12, stiffness: 120}});

  return (
    <div
      className={`answer-reveal ${visual ? 'answer-reveal--with-visual' : ''} ${correctOrder ? 'answer-reveal--ordering' : ''}`.trim()}
      style={{transform: `scale(${interpolate(pop, [0, 1], [0.86, 1])})`}}
    >
      <div className="celebration-dots" aria-hidden="true">
        <i /><i /><i /><i /><i />
      </div>
      {visual ? <AnswerVisual visual={visual} layout={layout} /> : null}
      <div className="answer-copy">
        <div className="eyebrow">Correct answer</div>
        <strong className="answer-word">{correctOrder ? orderedAnswerLabel : answer}</strong>
        <p className="answer-explanation">{explanation}</p>
        {correctOrder ? (
          <div
            className="ordering-answer"
            style={{gridTemplateColumns: `repeat(${correctOrder.length}, minmax(0, 1fr))`}}
          >
            {correctOrder.map((item, index) => (
              <div className="ordering-answer__step" key={item}>
                <span>{index + 1}</span>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {streak ? <Streak count={streak} /> : null}
    </div>
  );
};
