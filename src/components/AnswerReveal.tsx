type AnswerRevealProps = {
  answer: string;
  explanation: string;
};

export const AnswerReveal: React.FC<AnswerRevealProps> = ({
  answer,
  explanation,
}) => (
  <div className="answer-reveal">
    <div className="eyebrow">Correct answer</div>
    <strong className="answer-word">{answer}</strong>
    <p className="answer-explanation">{explanation}</p>
  </div>
);
