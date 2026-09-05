import type {PropsWithChildren} from 'react';
import {AbsoluteFill} from 'remotion';
import type {CreativeProfile} from '../types/content';

type ShortLayoutProps = PropsWithChildren<Pick<CreativeProfile, 'visualTheme' | 'presentationFormat'>>;

export const ShortLayout: React.FC<ShortLayoutProps> = ({children, presentationFormat, visualTheme}) => (
  <AbsoluteFill className="layout layout--short" data-format={presentationFormat} data-theme={visualTheme}>
    {children}
  </AbsoluteFill>
);
