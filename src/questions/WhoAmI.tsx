export const WhoAmI: React.FC<{clues: string[]}> = ({clues}) => (
  <div className="clues">
    {clues.map((clue, index) => (
      <div className="clue-pill" key={clue}>
        <span>{index + 1}</span>
        {clue}
      </div>
    ))}
  </div>
);
