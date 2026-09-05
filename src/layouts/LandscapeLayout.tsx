import type {PropsWithChildren} from 'react';
import {AbsoluteFill} from 'remotion';
import type {CreativeProfile} from '../types/content';

type LandscapeLayoutProps = PropsWithChildren<Pick<CreativeProfile, 'visualTheme' | 'presentationFormat'>>;

export const LandscapeLayout: React.FC<LandscapeLayoutProps> = ({children, presentationFormat, visualTheme}) => (
  <AbsoluteFill className="layout layout--landscape" data-format={presentationFormat} data-theme={visualTheme}>
    {children}
  </AbsoluteFill>
);
