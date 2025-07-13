import { useState, useEffect } from 'react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './services/supabase'
import { Scoreboard } from './components/Scoreboard'
import { QuestionCard } from './components/QuestionCard'
import type { NewQuestionPayload, AnswerResultPayload, Question, GamePhase } from './types'
import logo from '/logo.svg'
import './App.css'

import {
  GENERATE_QUESTION_FUNCTION,
  SUBMIT_ANSWER_FUNCTION,
  BROADCAST_CHANNEL,
  NEW_QUESTION_EVENT,
  ANSWER_RESULT_EVENT
} from './constants';

function App() {
  const [phase, setPhase] = useState<GamePhase>('landing');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [correct, setCorrect] = useState(0); 
  const [incorrect, setIncorrect] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean, explanation: string, correctAnswerIndex: number } | null>(null); 
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const channel = supabase.channel(BROADCAST_CHANNEL);

    channel.on(
      'broadcast', 
      { event: NEW_QUESTION_EVENT }, 

      (message: { payload: NewQuestionPayload }) => {
        console.log("NEW_QUESTION received!", message.payload);
        
        setCurrentQuestion(message.payload.question);
        setPhase('playing');
      }
    );

    channel.on(
      'broadcast', 
      { event: ANSWER_RESULT_EVENT },
      (message: { payload: AnswerResultPayload }) => {
        console.log("ANSWER_RESULT received!", message.payload);
        
        setAnswerResult(message.payload);
        setCorrect(message.payload.scores.correctAnswers ?? 0);
        setIncorrect(message.payload.scores.incorrectAnswers ?? 0);
      }
    );
    
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Realtime channel subscribed!');
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const generateQuestion = async () => {
    setErrorMsg('');
    setPhase('loading');
    const { error } = await supabase.functions.invoke(GENERATE_QUESTION_FUNCTION);
    if (error && error instanceof FunctionsHttpError) {
      const err = await error.context.json()
      setPhase('error');
      setErrorMsg(err?.error || 'An error occurred while generating the question.');
    }
  };

  const submitAnswer = async (selectedIndex: number) => {
    if (!currentQuestion || isAnswered) return;
    setErrorMsg('');
    setIsAnswered(true);
    setSelectedAnswer(selectedIndex);
  
    const { error } = await supabase.functions.invoke(SUBMIT_ANSWER_FUNCTION, {
      body: {
        questionId: currentQuestion.id,
        selectedOptionIndex: selectedIndex,
      },
    });

    if (error && error instanceof FunctionsHttpError) {
      const err = await error.context.json()
      setPhase('error');
      setErrorMsg(err?.error || 'An error occurred while submitting your answer.');
    }
  };

  const getNextQuestion = async () => {
    setCurrentQuestion(null);
    setIsAnswered(false);
    setSelectedAnswer(null);
    setAnswerResult(null);
    
    await generateQuestion();
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>AI Trivia Arena</h1>
        <Scoreboard correct={correct} incorrect={incorrect} />
      </header>

      <main className="game-area">
        {phase === 'landing' && (
          <div className="landing-screen">
            <button className="start-button" onClick={generateQuestion}>Start Game</button>
          </div>
        )}

        {phase === 'loading' && (
          <div className="card">
            <h2>Generating your question...</h2>
          </div>
        )}

        {phase === 'playing' && currentQuestion && (
            <QuestionCard
              question={currentQuestion}
              isAnswered={isAnswered}
              selectedAnswer={selectedAnswer}
              answerResult={answerResult}
              onAnswerSubmit={submitAnswer}
              onNextQuestion={getNextQuestion}
          />
        )}

        {phase === 'error' && (
          <div className="card error">
            {errorMsg && <p>{errorMsg}</p>}
            <button className="start-button" onClick={generateQuestion}>Try Again</button>
          </div>
        )}
      </main>
      <div className='logo-container'>
        <img src={logo} className="logo" alt="Logo" />
      </div>
    </div>
  );
}

export default App
