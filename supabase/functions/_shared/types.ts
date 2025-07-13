
export interface Question {
    id: string;
    created_at: string;
    question_text: string;
    options: string[];
    correct_answer_index: number;
    explanation: string | null;
  }

  export interface GameState {
    correct_answers: number;
    incorrect_answers: number;
  }

  export interface NewQuestionPayload {
    question: Question;
  }
  
  export interface AnswerResultPayload {
      isCorrect: boolean;
      explanation: string;
      correctAnswerIndex: number;
      scores: {
        correctAnswers: number;
        incorrectAnswers: number;
      };
  }

  export interface RequestBody {
    questionId: string;
    selectedOptionIndex: number;
  }