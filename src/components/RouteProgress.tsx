type RouteProgressProps = {
  current: number;
  stops: string[];
};

export const RouteProgress: React.FC<RouteProgressProps> = ({current, stops}) => (
  <div
    className={`body-route ${stops.length > 8 ? 'body-route--dense' : ''}`}
    aria-label={`Body journey stop ${current} of ${stops.length}`}
    style={{gridTemplateColumns: `repeat(${stops.length}, minmax(0, 1fr))`}}
  >
    <div className="body-route__line" />
    {stops.map((stop, index) => {
      const state = index + 1 < current ? 'complete' : index + 1 === current ? 'current' : 'upcoming';
      return (
        <div className={`body-route__stop body-route__stop--${state}`} key={`${stop}-${index}`}>
          <span>{index + 1 < current ? '✓' : index + 1}</span>
          <strong>{stop}</strong>
        </div>
      );
    })}
  </div>
);
