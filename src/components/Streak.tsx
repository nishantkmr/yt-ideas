export const Streak: React.FC<{count: number}> = ({count}) => (
  <div className="streak" aria-label={`Question ${count} complete`}>
    <span className="streak-spark">✦</span>
    <span>{count} down</span>
  </div>
);
