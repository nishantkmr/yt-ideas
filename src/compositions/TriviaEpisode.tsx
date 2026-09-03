import {Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {AnswerReveal} from '../components/AnswerReveal';
import {Background} from '../components/Background';
import {OptionGrid} from '../components/OptionGrid';
import {ProgressBar} from '../components/ProgressBar';
import {QuestionCard} from '../components/QuestionCard';
import {LandscapeLayout} from '../layouts/LandscapeLayout';
import type {Episode} from '../types/content';

const INTRO_SECONDS = 5;
const QUESTION_SECONDS = 12;

export const TriviaEpisode: React.FC<Episode> = ({title, questions}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <LandscapeLayout>
      <Background />
      <Sequence durationInFrames={INTRO_SECONDS * fps}>
        <div className="scene">
          <QuestionCard eyebrow="10-question challenge" text={title} layout="landscape" />
        </div>
      </Sequence>
      {questions.map((question, index) => {
        const start = (INTRO_SECONDS + index * QUESTION_SECONDS) * fps;
        const localFrame = frame - start;
        const showingAnswer = localFrame >= 8 * fps;

        return (
          <Sequence key={question.id} from={start} durationInFrames={QUESTION_SECONDS * fps}>
            <div className="scene">
              <ProgressBar current={index + 1} total={questions.length} />
              {showingAnswer ? (
                <AnswerReveal answer={question.answer} explanation={question.explanation} />
              ) : (
                <div className="question-stage">
                  <QuestionCard
                    eyebrow={index === questions.length - 1 ? 'Final boss' : `Level ${question.difficulty}`}
                    text={question.question}
                    layout="landscape"
                  />
                  {question.options ? <OptionGrid options={question.options} /> : null}
                  {question.clues ? (
                    <div className="clues">
                      {question.clues.map((clue) => (
                        <span className="clue-pill" key={clue}>
                          {clue}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </Sequence>
        );
      })}
    </LandscapeLayout>
  );
};
