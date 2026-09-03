type CountdownProps = {value: number};

export const Countdown: React.FC<CountdownProps> = ({value}) => (
  <div className="countdown" aria-label={`${value} seconds`}>
    {value}
  </div>
);
