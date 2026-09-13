import {interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {episodeNarrationAsset} from '../audio/narration';
import {CountdownTicks} from '../audio/CountdownTicks';
import {Voiceover} from '../audio/Voiceover';
import {MusicBed} from '../audio/MusicBed';
import {AnimatedScene} from '../components/AnimatedScene';
import {AnswerReveal} from '../components/AnswerReveal';
import {Background} from '../components/Background';
import {BossQuestion} from '../components/BossQuestion';
import {BodyJourneyProgress} from '../components/BodyJourneyProgress';
import {DigestiveDiagram} from '../components/DigestiveDiagram';
import {Mascot} from '../components/Mascot';
import {OptionGrid} from '../components/OptionGrid';
import {ProgressBar} from '../components/ProgressBar';
import {QuestionCard} from '../components/QuestionCard';
import {ScoreScreen} from '../components/ScoreScreen';
import {
  EPISODE_TIMING,
  getEpisodeAnswerSeconds,
  getEpisodeQuestionSeconds,
} from '../config/timing';
import {getPresentationCopy} from '../config/creative';
import {LandscapeLayout} from '../layouts/LandscapeLayout';
import {TrueFalse} from '../questions/TrueFalse';
import {WhoAmI} from '../questions/WhoAmI';
import {OrderingChallenge} from '../questions/OrderingChallenge';
import type {Episode} from '../types/content';

const INTRO_SECONDS = EPISODE_TIMING.intro;
const TIMER_SECONDS = EPISODE_TIMING.countdown;
const OUTRO_SECONDS = EPISODE_TIMING.outro;

export const TriviaEpisode: React.FC<Episode> = ({
  creative,
  narration,
  outroCallToAction,
  outroTimeSeconds = OUTRO_SECONDS,
  title,
  questions,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const presentation = getPresentationCopy(creative.presentationFormat);
  const journeyStops = questions.map((question, index) => question.journeyStop ?? `Stop ${index + 1}`);
  let nextStart = INTRO_SECONDS;
  const roundTimings = questions.map((question) => {
    const questionSeconds = getEpisodeQuestionSeconds(question);
    const answerSeconds = getEpisodeAnswerSeconds(question);
    const roundSeconds = questionSeconds + TIMER_SECONDS + answerSeconds;
    const timing = {start: nextStart, questionSeconds, answerSeconds, roundSeconds};
    nextStart += roundSeconds;
    return timing;
  });
  const outroStart = nextStart;

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
        const {start: startSeconds, questionSeconds, answerSeconds, roundSeconds} = roundTimings[index];
        const start = startSeconds * fps;
        const localFrame = frame - start;
        const countdown = Math.max(
          1,
          TIMER_SECONDS - Math.floor((localFrame - questionSeconds * fps) / fps),
        );
        const timerFrame = Math.max(0, localFrame - questionSeconds * fps);
        const timerEntrance = spring({
          fps,
          frame: timerFrame,
          config: {damping: 14, stiffness: 150},
        });
        const timerAccessory = localFrame >= questionSeconds * fps ? (
          <div
            className="choice-countdown-badge"
            style={{
              opacity: interpolate(timerEntrance, [0, 1], [0, 1]),
              transform: `scale(${interpolate(timerEntrance, [0, 1], [0.82, 1])})`,
            }}
          >
            <span>Choose</span>
            <strong>{countdown}</strong>
            <small>sec</small>
          </div>
        ) : null;
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
              accessory={timerAccessory}
              eyebrow={isBoss ? 'Final challenge' : `${presentation.roundLabel} ${index + 1}`}
              text={question.question}
              layout="landscape"
            />
            {question.visual?.type === 'digestive-diagram' ? (
              <div className="body-question-content">
                <DigestiveDiagram alt="Unlabelled digestive-system route for the question" revealed={false} />
                <div className="body-question-content__choices">
                  {choices}
                  {question.clues ? <WhoAmI clues={question.clues} /> : null}
                </div>
              </div>
            ) : (
              <>
                {choices}
                {question.clues ? <WhoAmI clues={question.clues} /> : null}
              </>
            )}
            {question.type === 'ordering' && question.items ? (
              <OrderingChallenge items={question.items} />
            ) : null}
          </div>
        );

        return (
          <Sequence key={question.id} from={start} durationInFrames={roundSeconds * fps}>
            {creative.presentationFormat === 'body-journey' ? (
              <BodyJourneyProgress current={index + 1} stops={journeyStops} />
            ) : (
              <ProgressBar current={index + 1} total={questions.length} />
            )}
            <Sequence durationInFrames={(questionSeconds + TIMER_SECONDS) * fps}>
              <Voiceover
                asset={episodeNarrationAsset(narration, `${question.id}-question`)}
                name={`Question ${index + 1}`}
              />
              <Sequence from={questionSeconds * fps} durationInFrames={TIMER_SECONDS * fps}>
                <CountdownTicks seconds={TIMER_SECONDS} />
              </Sequence>
              <AnimatedScene durationInFrames={(questionSeconds + TIMER_SECONDS) * fps}>
                {isBoss ? <BossQuestion>{questionStage}</BossQuestion> : questionStage}
              </AnimatedScene>
            </Sequence>
            <Sequence
              from={(questionSeconds + TIMER_SECONDS) * fps}
              durationInFrames={answerSeconds * fps}
            >
              <Voiceover
                asset={episodeNarrationAsset(narration, `${question.id}-answer`)}
                name={`Question ${index + 1} answer`}
              />
              <AnimatedScene durationInFrames={answerSeconds * fps}>
                <AnswerReveal
                  answer={question.answer}
                  explanation={question.explanation}
                  streak={index + 1}
                  visual={question.visual}
                  correctOrder={question.correctOrder}
                />
              </AnimatedScene>
            </Sequence>
          </Sequence>
        );
      })}
      <Sequence
        from={outroStart * fps}
        durationInFrames={outroTimeSeconds * fps}
      >
        <Voiceover asset={episodeNarrationAsset(narration, 'outro')} name="Episode outro" />
        <AnimatedScene durationInFrames={outroTimeSeconds * fps}>
          <ScoreScreen
            total={questions.length}
            completionLabel={presentation.completionLabel}
            callToAction={outroCallToAction}
          />
        </AnimatedScene>
      </Sequence>
    </LandscapeLayout>
  );
};
