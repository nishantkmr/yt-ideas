import type {Layout} from '../types/content';

type QuestionCardProps = {
  eyebrow?: string;
  text: string;
  layout: Layout;
};

export const QuestionCard: React.FC<QuestionCardProps> = ({
  eyebrow,
  text,
  layout,
}) => (
  <section className={`question-card question-card--${layout}`}>
    {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
    <div className="question-text">{text}</div>
  </section>
);
