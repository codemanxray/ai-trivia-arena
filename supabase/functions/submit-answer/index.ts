// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { SupabaseClient  } from "jsr:@supabase/supabase-js@2";
import OpenAI from 'jsr:@openai/openai';
import { corsHeaders } from "../_shared/cors.ts";
import { OPENAI_MODEL, QUESTIONS_TABLE, BRAODCAST_CHANNEL, GAME_STATE_TABLE, ANSWER_RESULT_EVENT, GAME_STATE_ID, BROADCAST } from '../_shared/constants.ts';
import type { AnswerResultPayload, GameState, Question, RequestBody } from '../_shared/types.ts';
import supabaseClient from "../_shared/supabaseClient.ts";

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

async function getQuestionById(client: SupabaseClient, id: string): Promise<Question> {
  const { data, error } = await client.from(QUESTIONS_TABLE).select("*").eq("id", id).single<Question>();
  if (error || !data) throw new Error(`Question with ID ${id} not found.`);
  return data;
}

async function getGameState(client: SupabaseClient): Promise<GameState> {
  const { data, error } = await client.from(GAME_STATE_TABLE).select("*").eq("id", GAME_STATE_ID).single<GameState>();
  if (error || !data) throw new Error("Game state not found.");
  return data;
}

async function generateExplanation(questionText: string, correctAnswer: string): Promise<string> {
  const prompt = `
      The trivia question was: "${questionText}"
      The correct answer is: "${correctAnswer}"
      
      Please provide a concise, 2-3 sentence explanation for why this is the correct answer.
      Do not start with "The correct answer is..." or repeat the answer. Just provide the explanation.
    `;
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: "You are a helpful assistant that provides trivia explanations." },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
    });

  return completion.choices[0].message.content || "Could not generate explanation.";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { questionId, selectedOptionIndex }: RequestBody = await req.json();
    if (!questionId || typeof selectedOptionIndex !== 'number') {
      throw new Error("Missing required fields: questionId and selectedOptionIndex.");
    }

    const question = await getQuestionById(supabaseClient, questionId);
    const gameState = await getGameState(supabaseClient);

    if (question.correct_answer_index === null) throw new Error("Question is missing a correct answer index.");

    const correctAnswerText = question.options[question.correct_answer_index];
    const explanation = await generateExplanation(question.question_text, correctAnswerText)
    const isCorrect = question.correct_answer_index === selectedOptionIndex;

    const finalScores  = {
      correct_answers: isCorrect ? gameState.correct_answers + 1 : gameState.correct_answers,
      incorrect_answers: !isCorrect ? gameState.incorrect_answers + 1 : gameState.incorrect_answers,
    };

    const payload: AnswerResultPayload = {
        isCorrect: isCorrect,
        explanation: explanation,
        correctAnswerIndex: question.correct_answer_index,
        scores: {
          correctAnswers: finalScores.correct_answers,
          incorrectAnswers: finalScores.incorrect_answers,
        }
      };

      const channel = supabaseClient.channel(BRAODCAST_CHANNEL);
      await channel.send({
        type: BROADCAST,
        event: ANSWER_RESULT_EVENT,
        payload: payload
      });

      const [gameStateUpdateResponse, questionUpdateResponse] = await Promise.all([
        supabaseClient.from(GAME_STATE_TABLE)
          .update({correct_answers: finalScores.correct_answers,incorrect_answers: finalScores.incorrect_answers})
          .eq("id", 1),
        supabaseClient.from(QUESTIONS_TABLE).update({ explanation: explanation }).eq("id", questionId)
      ]);

    if (gameStateUpdateResponse.error || questionUpdateResponse.error) {
      throw new Error(`Failed to update database: ${gameStateUpdateResponse.error || questionUpdateResponse.error }`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});