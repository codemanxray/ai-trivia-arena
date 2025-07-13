import type { Question } from '../types';
  
  interface AnswerResult {
    isCorrect: boolean;
    explanation: string;
    correctAnswerIndex: number;
  }
  
  interface QuestionProps {
    question: Question;
    isAnswered: boolean;
    selectedAnswer: number | null;
    answerResult: AnswerResult | null;
    onAnswerSubmit: (index: number) => void;
    onNextQuestion: () => void;
  }
  
  export function QuestionCard({
    question,
    isAnswered,
    selectedAnswer,
    answerResult,
    onAnswerSubmit,
    onNextQuestion,
  }: QuestionProps) {
    return (
      <div className="card">
        <h2>{question.question_text}</h2>
        <div className="options-grid">
          {question.options.map((option, index) => {
            let buttonClass = 'option-button';
            if (isAnswered && answerResult) {
              if (index === answerResult.correctAnswerIndex) buttonClass += ' correct';
              else if (index === selectedAnswer) buttonClass += ' incorrect';
            }
            return (
              <button
                key={index}
                className={buttonClass}
                onClick={() => onAnswerSubmit(index)}
                disabled={isAnswered}
              >
                {option}
              </button>
            );
          })}
        </div>
  
        {isAnswered && !answerResult && (
          <div className="feedback-panel"><p>Checking your answer...</p></div>
        )}
  
        {answerResult && (
          <div className="feedback-panel">
            <h3>{answerResult.isCorrect ? 'Correct! 🎉' : 'Incorrect!'}</h3>
            <p>{answerResult.explanation}</p>
            <button className="next-button" onClick={onNextQuestion}>
              Next Question
            </button>
          </div>
        )}
      </div>
    );
  }