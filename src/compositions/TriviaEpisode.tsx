import {Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {episodeNarrationAsset} from '../audio/narration';
import {CountdownTicks} from '../audio/CountdownTicks';
import {Voiceover} from '../audio/Voiceover';
import {MusicBed} from '../audio/MusicBed';
import {AnimatedScene} from '../components/AnimatedScene';
import {AnswerReveal} from '../components/AnswerReveal';
import {Background} from '../components/Background';
import {BossQuestion} from '../components/BossQuestion';
import {Countdown} from '../components/Countdown';
import {Mascot} from '../components/Mascot';
import {OptionGrid} from '../components/OptionGrid';
import {ProgressBar} from '../components/ProgressBar';
import {QuestionCard} from '../components/QuestionCard';
import {ScoreScreen} from '../components/ScoreScreen';
import {EPISODE_TIMING} from '../config/timing';
import {PRESENTATION_COPY} from '../config/creative';
import {LandscapeLayout} from '../layouts/LandscapeLayout';
import {TrueFalse} from '../questions/TrueFalse';
import {WhoAmI} from '../questions/WhoAmI';
import type {Episode} from '../types/content';

const INTRO_SECONDS = EPISODE_TIMING.intro;
const QUESTION_SECONDS = EPISODE_TIMING.question;
const TIMER_SECONDS = EPISODE_TIMING.countdown;
const ANSWER_SECONDS = EPISODE_TIMING.answer;
const ROUND_SECONDS = QUESTION_SECONDS + TIMER_SECONDS + ANSWER_SECONDS;
const OUTRO_SECONDS = EPISODE_TIMING.outro;

export const TriviaEpisode: React.FC<Episode> = ({creative, narration, title, questions}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const presentation = PRESENTATION_COPY[creative.presentationFormat];

  return (
    <LandscapeLayout presentationFormat={creative.presentationFormat} visualTheme={creative.visualTheme}>
      <Background />
      <MusicBed theme={creative.visualTheme} />
      <Sequence durationInFrames={INTRO_SECONDS * fps}>
        <Voiceover asset={episodeNarrationAsset(narration, 'intro')} name="Episode intro" />
        <AnimatedScene className="episode-intro" durationInFrames={INTRO_SECONDS * fps}>
          <Mascot message="Ready to play?" />
          <QuestionCard eyebrow={presentation.challengeLabel} text={title} layout="landscape" />
        </AnimatedScene>
      </Sequence>
      {questions.map((question, index) => {
        const start = (INTRO_SECONDS + index * ROUND_SECONDS) * fps;
        const localFrame = frame - start;
        const countdown = Math.max(
          1,
          TIMER_SECONDS - Math.floor((localFrame - QUESTION_SECONDS * fps) / fps),
        );
        const isBoss = index === questions.length - 1;
        const choices = question.options ? (
          question.type === 'true-false' ? (
            <TrueFalse answer={question.answer} revealed={false} />
          ) : (
            <OptionGrid
              answer={question.answer}
              options={question.options}
              revealed={false}
            />
          )
        ) : null;

        const questionStage = (
          <div className="question-stage">
            <QuestionCard
              eyebrow={isBoss ? 'Final challenge' : `${presentation.roundLabel} ${index + 1}`}
              text={question.question}
              layout="landscape"
            />
            {choices}
            {question.clues ? <WhoAmI clues={question.clues} /> : null}
          </div>
        );

        return (
          <Sequence key={question.id} from={start} durationInFrames={ROUND_SECONDS * fps}>
            <ProgressBar current={index + 1} total={questions.length} />
            <Sequence durationInFrames={QUESTION_SECONDS * fps}>
              <Voiceover
                asset={episodeNarrationAsset(narration, `${question.id}-question`)}
                name={`Question ${index + 1}`}
              />
              <AnimatedScene durationInFrames={QUESTION_SECONDS * fps}>
                {isBoss ? <BossQuestion>{questionStage}</BossQuestion> : questionStage}
              </AnimatedScene>
            </Sequence>
            <Sequence from={QUESTION_SECONDS * fps} durationInFrames={TIMER_SECONDS * fps}>
              <CountdownTicks seconds={TIMER_SECONDS} />
              <AnimatedScene className="episode-countdown" durationInFrames={TIMER_SECONDS * fps}>
                <div className="think-prompt">
                  <span>{presentation.countdownPrompt}</span>
                  <strong>{presentation.countdownAction}</strong>
                </div>
                <Countdown value={countdown} />
              </AnimatedScene>
            </Sequence>
            <Sequence
              from={(QUESTION_SECONDS + TIMER_SECONDS) * fps}
              durationInFrames={ANSWER_SECONDS * fps}
            >
              <Voiceover
                asset={episodeNarrationAsset(narration, `${question.id}-answer`)}
                name={`Question ${index + 1} answer`}
              />
              <AnimatedScene durationInFrames={ANSWER_SECONDS * fps}>
                <AnswerReveal
                  answer={question.answer}
                  explanation={question.explanation}
                  streak={index + 1}
                  visual={question.visual}
                />
              </AnimatedScene>
            </Sequence>
          </Sequence>
        );
      })}
      <Sequence
        from={(INTRO_SECONDS + questions.length * ROUND_SECONDS) * fps}
        durationInFrames={OUTRO_SECONDS * fps}
      >
        <Voiceover asset={episodeNarrationAsset(narration, 'outro')} name="Episode outro" />
        <AnimatedScene durationInFrames={OUTRO_SECONDS * fps}>
          <ScoreScreen total={questions.length} completionLabel={presentation.completionLabel} />
        </AnimatedScene>
      </Sequence>
    </LandscapeLayout>
  );
};
