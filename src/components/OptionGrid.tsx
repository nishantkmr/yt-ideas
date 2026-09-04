import {spring, useCurrentFrame, useVideoConfig} from 'remotion';

type OptionGridProps = {
  options: string[];
  answer?: string;
  revealed?: boolean;
};

export const OptionGrid: React.FC<OptionGridProps> = ({
  options,
  answer,
  revealed = false,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <div className="option-grid">
      {options.map((option, index) => {
        const entrance = spring({
          fps,
          frame: frame - index * 4,
          config: {damping: 18, stiffness: 130},
        });
        const correct = revealed && option === answer;
        const incorrect = revealed && option !== answer;

        return (
          <div
            className={`option ${correct ? 'is-correct' : ''} ${incorrect ? 'is-incorrect' : ''}`.trim()}
            key={option}
            style={{
              opacity: entrance * (incorrect ? 0.42 : 1),
              transform: `translateY(${(1 - entrance) * 28}px)`,
            }}
          >
            <span className="option-key">{String.fromCharCode(65 + index)}</span>
            <span className="option-label">{option}</span>
            {correct ? <span className="option-result">Correct!</span> : null}
          </div>
        );
      })}
    </div>
  );
};
