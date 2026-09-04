type TrueFalseProps = {
  answer: string;
  revealed?: boolean;
};

const choices = ['True', 'False'];

export const TrueFalse: React.FC<TrueFalseProps> = ({answer, revealed = false}) => (
  <div className="true-false-grid">
    {choices.map((choice) => {
      const correct = revealed && choice === answer;
      const incorrect = revealed && choice !== answer;
      return (
        <div
          className={`true-false-choice ${correct ? 'is-correct' : ''} ${incorrect ? 'is-incorrect' : ''}`.trim()}
          key={choice}
        >
          <span>{choice === 'True' ? '✓' : '×'}</span>
          {choice}
        </div>
      );
    })}
  </div>
);
