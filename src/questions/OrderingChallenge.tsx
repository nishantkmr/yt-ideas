import {spring, useCurrentFrame, useVideoConfig} from 'remotion';

type OrderingChallengeProps = {
  items: string[];
};

export const OrderingChallenge: React.FC<OrderingChallengeProps> = ({items}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <div
      className="ordering-challenge"
      // The count is a custom property rather than an inline grid, so a layout
      // with less room -- the choices column beside a visual -- can restyle the
      // grid without fighting an inline style.
      style={{'--ordering-columns': items.length} as React.CSSProperties}
    >
      {items.map((item, index) => {
        const entrance = spring({
          fps,
          frame: frame - index * 4,
          config: {damping: 15, stiffness: 120},
        });
        return (
          <div
            className="ordering-item"
            key={item}
            style={{opacity: entrance, transform: `scale(${0.86 + entrance * 0.14})`}}
          >
            <span>{index + 1}</span>
            <strong>{item}</strong>
          </div>
        );
      })}
    </div>
  );
};
