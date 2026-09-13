type QuestionStageProps = {
  layout: 'inline' | 'split';
  visual: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Arranges a question's visual and its choices. 'split' places a tall or wide
 * visual beside the choices; 'inline' simply stacks them, which is what a
 * question with no visual of its own uses.
 */
export const QuestionStage: React.FC<QuestionStageProps> = ({layout, visual, children}) => {
  if (layout === 'split' && visual) {
    return (
      <div className="question-stage__split">
        {visual}
        <div className="question-stage__choices">{children}</div>
      </div>
    );
  }

  return (
    <>
      {visual}
      {children}
    </>
  );
};
