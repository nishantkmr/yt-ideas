import type {PropsWithChildren} from 'react';
import {AbsoluteFill} from 'remotion';

export const LandscapeLayout: React.FC<PropsWithChildren> = ({children}) => (
  <AbsoluteFill className="layout layout--landscape">{children}</AbsoluteFill>
);
