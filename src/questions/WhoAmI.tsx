export const WhoAmI: React.FC<{clues: string[]}> = ({clues}) => <div>{clues.join(' • ')}</div>;
