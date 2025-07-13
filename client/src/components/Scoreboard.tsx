interface ScoreboardProps {
    correct: number;
    incorrect: number;
  }
  
  export function Scoreboard({ correct, incorrect }: ScoreboardProps) {
    const totalAnswered = correct + incorrect;
    const accuracy = totalAnswered > 0 ? Math.round((correct / totalAnswered) * 100) : 0;

    return (
        <div className="scoreboard">
        <span className="scoreboard-label">SCORE</span>
        <span className="scoreboard-value">{correct} / {correct + incorrect}</span>
        <small className="scoreboard-value">{accuracy}%</small>
      </div>
    )
};