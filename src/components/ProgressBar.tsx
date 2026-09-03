type ProgressBarProps = {current: number; total: number};

export const ProgressBar: React.FC<ProgressBarProps> = ({current, total}) => (
  <div className="progress-wrap">
    <div className="progress-label">
      <span>Quiz progress</span>
      <span className="progress-count">Question {current} of {total}</span>
    </div>
    <div className="progress-track">
      <div className="progress-fill" style={{width: `${(current / total) * 100}%`}} />
    </div>
  </div>
);
