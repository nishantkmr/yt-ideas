import type {PropsWithChildren} from 'react';

export const BossQuestion: React.FC<PropsWithChildren> = ({children}) => (
  <div className="boss-stage">
    <div className="boss-banner">
      <span className="boss-crown">★</span>
      Final boss · double points
    </div>
    {children}
  </div>
);
