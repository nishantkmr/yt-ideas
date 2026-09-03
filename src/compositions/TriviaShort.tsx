import {Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {AnswerReveal} from '../components/AnswerReveal';
import {Background} from '../components/Background';
import {Countdown} from '../components/Countdown';
import {QuestionCard} from '../components/QuestionCard';
import {ShortLayout} from '../layouts/ShortLayout';
import type {TriviaShortData} from '../types/content';

export const TriviaShort: React.FC<TriviaShortData> = ({answer, clues, funFact}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const countdown = Math.max(1, 3 - Math.floor((frame - 10 * fps) / fps));

  return (
    <ShortLayout>
      <Background />
      <Sequence durationInFrames={2 * fps}>
        <div className="scene">
          <QuestionCard eyebrow="Animal challenge" text="Guess the animal!" layout="short" />
        </div>
      </Sequence>
      <Sequence from={2 * fps} durationInFrames={4 * fps}>
        <div className="scene">
          <QuestionCard eyebrow="Clue 1" text={clues[0]} layout="short" />
        </div>
      </Sequence>
      <Sequence from={6 * fps} durationInFrames={4 * fps}>
        <div className="scene">
          <QuestionCard eyebrow="Clue 2" text={clues[1]} layout="short" />
        </div>
      </Sequence>
      <Sequence from={10 * fps} durationInFrames={3 * fps}>
        <div className="scene countdown-scene">
          <div className="think-prompt">
            <span>Think fast</span>
            <strong>Lock it in!</strong>
          </div>
          <Countdown value={countdown} />
        </div>
      </Sequence>
      <Sequence from={13 * fps} durationInFrames={5 * fps}>
        <div className="scene">
          <AnswerReveal answer={answer} explanation="You got it!" />
        </div>
      </Sequence>
      <Sequence from={18 * fps} durationInFrames={6 * fps}>
        <div className="scene">
          <QuestionCard eyebrow="Fun fact" text={funFact} layout="short" />
        </div>
      </Sequence>
    </ShortLayout>
  );
};
