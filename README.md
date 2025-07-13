<br />
<h1>AI Trivia Arena</h1>
AI Trivia Arena is a fast-paced, single-player quiz application where each trivia question and its explanation are generated on the fly by an LLM (OpenAI). This project uses React for the frontend and Supabase for the backend infrastructure, including Edge Functions for server-side logic.

## Setup
Follow these steps to get the project running locally.

### Prerequisites
- Node.js (v18 or later)
- npm or yarn
- Supabase Account
- OpenAI Account and API Key
- <a hrf="https://supabase.com/docs/guides/local-development"> Supabase CLI</a> (installed and authenticatedd)

### 1. Clone the Repository
```bash 
git clone <your-repo-url>
cd <your-repo-folder>
```
### 2. Setup the Frontend (React app)
```bash
# Navigate to the React app directory
cd src
# Install dependencies
npm install
# Create a local environment file
cp .env.example .env.local
```
### 3. Setup the Backend (Supabase)
From the project root, link the local project to your Supabase project and push the necessary secrets. (create a new project from the Supabase dashboard)
```bash
# Link your local repo to your Supabase project (get the ref from your project's dashboard URL)
npx supabase link --project-ref <your-project-ref>
# Set the OpenAI API key as a secret. 
npx supabase secrets set OPENAI_API_KEY=<your-openai-api-key>
# Deploy the Edge Functions
npx supabase functions deploy generate-question --no-verify-jwt
npx supabase functions deploy submit-answer --no-verify-jwt
```
## Supabase Configuration
### 1. Create Database Tables
Navigate to the SQL Editor in your Supabase dashboard and run the following queries to create the necessary tables.
#### Create the questions table:
```sql
CREATE TABLE public.questions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  question_text text,
  options jsonb,
  correct_answer_index smallint,
  explanation text,
);
```
#### Create the game_state table and initial row:
```sql
CREATE TABLE public.game_state (
  id bigint NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  correct_answers integer DEFAULT 0 NOT NULL,
  incorrect_answers integer DEFAULT 0 NOT NULL,
  CONSTRAINT game_stats_pkey PRIMARY KEY (id)
);
INSERT INTO public.game_state (id, correct_answers, incorrect_answers) VALUES (1, 0, 0);
```
### 2. Create Frontend Environment Variables
1. Go to your Supabase project dashboard.
2. Navigate to Project Settings > API.
3. Find your Project URL and the anon public key.
4. Open the .env.local file in your frontend directory (src or ai-trivia-arena-client) and populate it with these values.
```bash
VITE_SUPABASE_URL="https---your-project-url---.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-public-key"
```
### 3. Run the Application
```bash
# From your frontend directory
npm run dev
````
##### The application should now be running, typically at http://localhost:5173.

<h1>Design decisions</h1>

### Realtime via Broadcast Channels:
- Provides more flexibility by allowing custom event payloads (NEW_QUESTION, ANSWER_RESULT).
- The client UI updates seamlessly without page reloads.

### Backend Logic
- All critical logic, including answer verification, score updates, and communication with OpenAI, is handled exclusively on the backend within Supabase Edge Functions.

### Single-Player Focus
- The application is designed for a single-player experience. The game_state table contains only a single row to track the score, simplifying state management.
### Separate Backend/Frontend Types
- To mimic a real-world scenario where frontend and backend apps are developed and deployed independently, the TypeScript type definitions are maintained separately in each codebase.
