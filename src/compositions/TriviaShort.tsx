import {Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {AnimatedScene} from '../components/AnimatedScene';
import {shortNarrationAsset} from '../audio/narration';
import {Voiceover} from '../audio/Voiceover';
import {CountdownTicks} from '../audio/CountdownTicks';
import {MusicBed} from '../audio/MusicBed';
import {AnswerReveal} from '../components/AnswerReveal';
import {Background} from '../components/Background';
import {Countdown} from '../components/Countdown';
import {DigestiveDiagram} from '../components/DigestiveDiagram';
import {Mascot} from '../components/Mascot';
import {QuestionCard} from '../components/QuestionCard';
import {ScoreScreen} from '../components/ScoreScreen';
import {SHORT_TIMING} from '../config/timing';
import {getPresentationCopy} from '../config/creative';
import {ShortLayout} from '../layouts/ShortLayout';
import {GuessPicture} from '../questions/GuessPicture';
import type {TriviaShortData} from '../types/content';

export const TriviaShort: React.FC<TriviaShortData> = ({
  answer,
  clueTimeSeconds = SHORT_TIMING.clue,
  clues,
  creative,
  funFact,
  narration,
  title,
  visual,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const clueOneStart = SHORT_TIMING.intro;
  const clueTwoStart = clueOneStart + clueTimeSeconds;
  const countdownStart = clueTwoStart + clueTimeSeconds;
  const answerStart = countdownStart + SHORT_TIMING.countdown;
  const factStart = answerStart + SHORT_TIMING.answer;
  const outroStart = factStart + SHORT_TIMING.fact;
  const countdown = Math.max(
    1,
    SHORT_TIMING.countdown - Math.floor((frame - countdownStart * fps) / fps),
  );
  const presentation = getPresentationCopy(creative.presentationFormat);

  return (
    <ShortLayout presentationFormat={creative.presentationFormat} visualTheme={creative.visualTheme}>
      <Background />
      <MusicBed theme={creative.visualTheme} />
      <Sequence durationInFrames={SHORT_TIMING.intro * fps}>
        <Voiceover asset={shortNarrationAsset(narration, 'intro')} name="Short intro" />
        <AnimatedScene className="short-intro" durationInFrames={SHORT_TIMING.intro * fps}>
          <Mascot compact />
          <QuestionCard eyebrow={presentation.challengeLabel} text={title ?? 'Solve the clues!'} layout="short" />
        </AnimatedScene>
      </Sequence>
      <Sequence from={clueOneStart * fps} durationInFrames={clueTimeSeconds * fps}>
        <Voiceover asset={shortNarrationAsset(narration, 'clue-1')} name="Clue one" />
        <AnimatedScene className="short-clue" durationInFrames={clueTimeSeconds * fps}>
          <QuestionCard eyebrow="Clue 1" text={clues[0]} layout="short" />
        </AnimatedScene>
      </Sequence>
      <Sequence from={clueTwoStart * fps} durationInFrames={clueTimeSeconds * fps}>
        <Voiceover asset={shortNarrationAsset(narration, 'clue-2')} name="Clue two" />
        <AnimatedScene className="short-clue" durationInFrames={clueTimeSeconds * fps}>
          <QuestionCard eyebrow="Clue 2" text={clues[1]} layout="short" />
        </AnimatedScene>
      </Sequence>
      <Sequence from={countdownStart * fps} durationInFrames={SHORT_TIMING.countdown * fps}>
        <CountdownTicks seconds={SHORT_TIMING.countdown} />
        <AnimatedScene
          className="countdown-scene"
          durationInFrames={SHORT_TIMING.countdown * fps}
        >
          <div className="think-prompt">
            <span>{presentation.countdownPrompt}</span>
            <strong>{presentation.countdownAction}</strong>
          </div>
          <Countdown value={countdown} />
        </AnimatedScene>
      </Sequence>
      <Sequence from={answerStart * fps} durationInFrames={SHORT_TIMING.answer * fps}>
        <Voiceover asset={shortNarrationAsset(narration, 'answer')} name="Answer" />
        <AnimatedScene className="short-answer" durationInFrames={SHORT_TIMING.answer * fps}>
          {visual.type === 'digestive-diagram' ? (
            <DigestiveDiagram
              alt={visual.alt}
              answerHint={visual.answerHint}
              answerLabel={visual.answerLabel}
              focus={visual.focus}
              revealed
            />
          ) : (
            <GuessPicture alt={visual.alt} asset={visual.asset} />
          )}
          <AnswerReveal answer={answer} explanation="You got it!" streak={1} />
        </AnimatedScene>
      </Sequence>
      <Sequence from={factStart * fps} durationInFrames={SHORT_TIMING.fact * fps}>
        <Voiceover asset={shortNarrationAsset(narration, 'fact')} name="Fun fact" />
        <AnimatedScene className="short-fact" durationInFrames={SHORT_TIMING.fact * fps}>
          <Mascot compact message="Did you know?" />
          <QuestionCard eyebrow="Fun fact" text={funFact} layout="short" />
        </AnimatedScene>
      </Sequence>
      <Sequence from={outroStart * fps} durationInFrames={SHORT_TIMING.outro * fps}>
        <Voiceover asset={shortNarrationAsset(narration, 'outro')} name="Short outro" />
        <AnimatedScene durationInFrames={SHORT_TIMING.outro * fps}>
          <ScoreScreen total={1} completionLabel={presentation.completionLabel} />
        </AnimatedScene>
      </Sequence>
    </ShortLayout>
  );
};
