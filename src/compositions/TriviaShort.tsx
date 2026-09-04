import {Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {AnimatedScene} from '../components/AnimatedScene';
import {AnswerReveal} from '../components/AnswerReveal';
import {Background} from '../components/Background';
import {Countdown} from '../components/Countdown';
import {Mascot} from '../components/Mascot';
import {QuestionCard} from '../components/QuestionCard';
import {ScoreScreen} from '../components/ScoreScreen';
import {ShortLayout} from '../layouts/ShortLayout';
import {GuessPicture} from '../questions/GuessPicture';
import type {TriviaShortData} from '../types/content';

export const TriviaShort: React.FC<TriviaShortData> = ({answer, clues, funFact, visual}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const countdown = Math.max(1, 3 - Math.floor((frame - 10 * fps) / fps));

  return (
    <ShortLayout>
      <Background />
      <Sequence durationInFrames={2 * fps}>
        <AnimatedScene className="short-intro" durationInFrames={2 * fps}>
          <Mascot compact />
          <QuestionCard eyebrow="Animal challenge" text="Guess the animal!" layout="short" />
        </AnimatedScene>
      </Sequence>
      <Sequence from={2 * fps} durationInFrames={4 * fps}>
        <AnimatedScene className="short-clue" durationInFrames={4 * fps}>
          <QuestionCard eyebrow="Clue 1" text={clues[0]} layout="short" />
        </AnimatedScene>
      </Sequence>
      <Sequence from={6 * fps} durationInFrames={4 * fps}>
        <AnimatedScene className="short-clue" durationInFrames={4 * fps}>
          <QuestionCard eyebrow="Clue 2" text={clues[1]} layout="short" />
        </AnimatedScene>
      </Sequence>
      <Sequence from={10 * fps} durationInFrames={3 * fps}>
        <AnimatedScene className="countdown-scene" durationInFrames={3 * fps}>
          <div className="think-prompt">
            <span>Think fast</span>
            <strong>Lock it in!</strong>
          </div>
          <Countdown value={countdown} />
        </AnimatedScene>
      </Sequence>
      <Sequence from={13 * fps} durationInFrames={5 * fps}>
        <AnimatedScene className="short-answer" durationInFrames={5 * fps}>
          <GuessPicture alt={visual.alt} asset={visual.asset} />
          <AnswerReveal answer={answer} explanation="You got it!" streak={1} />
        </AnimatedScene>
      </Sequence>
      <Sequence from={18 * fps} durationInFrames={6 * fps}>
        <AnimatedScene className="short-fact" durationInFrames={6 * fps}>
          <Mascot compact message="Did you know?" />
          <QuestionCard eyebrow="Fun fact" text={funFact} layout="short" />
        </AnimatedScene>
      </Sequence>
      <Sequence from={24 * fps} durationInFrames={4 * fps}>
        <AnimatedScene durationInFrames={4 * fps}>
          <ScoreScreen total={1} />
        </AnimatedScene>
      </Sequence>
    </ShortLayout>
  );
};
