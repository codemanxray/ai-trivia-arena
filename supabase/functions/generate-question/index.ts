// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from 'jsr:@openai/openai';
import { corsHeaders } from "../_shared/cors.ts";
import { OPENAI_MODEL, QUESTIONS_TABLE, BRAODCAST_CHANNEL, NEW_QUESTION_EVENT } from '../_shared/constants.ts';
import type { NewQuestionPayload, Question } from '../_shared/types.ts';
import supabaseClient from "../_shared/supabaseClient.ts";

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const questionsHistoryLimit = 10;

async function getRecentQuestionHistory(client: SupabaseClient): Promise<string> {
  const { data, error } = await client
    .from(QUESTIONS_TABLE)
    .select("question_text")
    .order("created_at", { ascending: false })
    .limit(questionsHistoryLimit);

  if (error) {
    console.error("Error fetching recent questions.", error.message);
    return "None";
  }
  
  if (!data || data.length === 0) {
    return "None";
  }

  return data.map(q => `- ${q.question_text}`).join("\n");
}

async function generateNewTriviaQuestion(recentQuestionsText: string): Promise<any> {
  const prompt = `
    You are a trivia question JSON generator. Do not explain, apologize, or say anything else. Generate one unique trivia question with 4 multiple-choice options. Exactly one of the options must be correct. Respond with ONLY a raw JSON object with **no code block formatting**, comments, or extra text. IMPORTANT: The question should be unique and not similar to the recent questions: ${recentQuestionsText}
    The JSON object must have these exact keys:
    - "question": (string) — The trivia question
    - "options": (array of 4 strings) — The multiple-choice options
    - "correctAnswerIndex": (number) — The 0-based index of the correct answer in the "options" array.
    Example:
    {
      "question": "What is the capital of France?",
      "options": ["Paris", "London", "Berlin", "Madrid"],
      "correctAnswerIndex": 0
    }
    `;

    const systemContent = `
      You are a trivia question generator. 
      Always create unique, interesting, and never-before-seen trivia questions.
      `;

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemContent 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.9, 
    });

  const aiResponse = completion.choices[0].message.content;
  if (!aiResponse) {
    throw new Error("OpenAI returned an empty response.");
  }

  const { question, options, correctAnswerIndex } = JSON.parse(aiResponse);

  if (!question || !options || !Array.isArray(options) || options.length !== 4 || typeof correctAnswerIndex !== 'number') {
    throw new Error("Invalid response from OpenAI.");
  }

  return JSON.parse(aiResponse);
}

async function saveQuestion(client: SupabaseClient, questionData: any): Promise<Question> {
  const { question, options, correctAnswerIndex } = questionData;

  if (!question || !options || !Array.isArray(options) || options.length !== 4 || typeof correctAnswerIndex !== 'number') {
    throw new Error("Invalid JSON structure received from OpenAI.");
  }
  
  const { data, error } = await client
    .from(QUESTIONS_TABLE)
    .insert({
      question_text: question,
      options: options,
      correct_answer_index: correctAnswerIndex,
    })
    .select()
    .single<Question>();

  if (error || !data) {
    throw new Error(`Failed to insert new question into database: ${error}`);
  }
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const history = await getRecentQuestionHistory(supabaseClient);
    const triviaData = await generateNewTriviaQuestion(history);
    const newQuestion = await saveQuestion(supabaseClient, triviaData);

    const channel = supabaseClient.channel(BRAODCAST_CHANNEL);

    const payload: NewQuestionPayload = {
      question: newQuestion 
    }     

    await channel.send({
      type: 'broadcast',
      event: NEW_QUESTION_EVENT,
      payload: payload,
    });

    return new Response(JSON.stringify({ success: true, questionId: newQuestion?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({success: false, error: error.message}), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});