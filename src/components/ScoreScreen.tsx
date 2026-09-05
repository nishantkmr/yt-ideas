import {Mascot} from './Mascot';

type ScoreScreenProps = {
  total: number;
  completionLabel?: string;
};

export const ScoreScreen: React.FC<ScoreScreenProps> = ({completionLabel = 'Adventure complete', total}) => (
  <div className="score-screen">
    <Mascot compact message="You made Quiz Owl proud!" />
    <div className="score-card">
      <div className="finale-stars" aria-hidden="true">★ ✦ ★</div>
      <div className="eyebrow">{completionLabel}</div>
      <strong>High five!</strong>
      <span>{total} {total === 1 ? 'mystery' : 'questions'} conquered</span>
      <p>Thanks for playing—your curiosity is your superpower.</p>
      <small>Keep exploring. Another amazing discovery is waiting for you!</small>
    </div>
  </div>
);
