type RouteProgressProps = {
  current: number;
  stops: string[];
};

export const RouteProgress: React.FC<RouteProgressProps> = ({current, stops}) => (
  <div
    className={`route-progress ${stops.length > 8 ? 'route-progress--dense' : ''}`}
    aria-label={`Journey stop ${current} of ${stops.length}`}
    style={{gridTemplateColumns: `repeat(${stops.length}, minmax(0, 1fr))`}}
  >
    <div className="route-progress__line" />
    {stops.map((stop, index) => {
      const state = index + 1 < current ? 'complete' : index + 1 === current ? 'current' : 'upcoming';
      return (
        <div className={`route-progress__stop route-progress__stop--${state}`} key={`${stop}-${index}`}>
          <span>{index + 1 < current ? '✓' : index + 1}</span>
          <strong>{stop}</strong>
        </div>
      );
    })}
  </div>
);
