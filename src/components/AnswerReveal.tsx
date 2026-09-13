import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {GuessPicture} from '../questions/GuessPicture';
import {DigestiveDiagram} from './DigestiveDiagram';
import {Streak} from './Streak';
import type {QuizVisual} from '../types/content';

type AnswerRevealProps = {
  answer: string;
  explanation: string;
  streak?: number;
  visual?: QuizVisual;
  correctOrder?: string[];
};

export const AnswerReveal: React.FC<AnswerRevealProps> = ({
  answer,
  explanation,
  streak,
  visual,
  correctOrder,
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
      {visual?.type === 'digestive-diagram' ? (
        <DigestiveDiagram
          alt={visual.alt}
          answerHint={visual.answerHint}
          answerLabel={visual.answerLabel}
          focus={visual.focus}
          revealed
        />
      ) : visual ? (
        <GuessPicture alt={visual.alt} asset={visual.asset} />
      ) : null}
      <div className="answer-copy">
        <div className="eyebrow">Correct answer</div>
        <strong className="answer-word">{correctOrder ? 'Correct route' : answer}</strong>
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
