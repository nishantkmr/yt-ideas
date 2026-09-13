import type {ReactNode} from 'react';
import type {Layout} from '../types/content';

type QuestionCardProps = {
  accessory?: ReactNode;
  eyebrow?: string;
  text: string;
  layout: Layout;
};

export const QuestionCard: React.FC<QuestionCardProps> = ({
  accessory,
  eyebrow,
  text,
  layout,
}) => (
  <section className={`question-card question-card--${layout}`}>
    {accessory ? <div className="question-card__accessory">{accessory}</div> : null}
    {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
    <div className="question-text">{text}</div>
  </section>
);
