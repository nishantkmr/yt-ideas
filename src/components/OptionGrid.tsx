type OptionGridProps = {
  options: string[];
};

export const OptionGrid: React.FC<OptionGridProps> = ({options}) => (
  <div className="option-grid">
    {options.map((option, index) => (
      <div className="option" key={option}>
        <span className="option-key">{String.fromCharCode(65 + index)}</span>
        {option}
      </div>
    ))}
  </div>
);
