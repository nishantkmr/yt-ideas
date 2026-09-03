import type {PropsWithChildren} from 'react';
import {AbsoluteFill} from 'remotion';

export const ShortLayout: React.FC<PropsWithChildren> = ({children}) => (
  <AbsoluteFill className="layout layout--short">{children}</AbsoluteFill>
);
