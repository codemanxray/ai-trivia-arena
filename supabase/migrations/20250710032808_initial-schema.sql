
create table "questions" (
  "id" uuid primary key default gen_random_uuid(),
  "created_at" timestamp with time zone default now() not null,
  "question_text" text not null,
  "options" jsonb not null, 
  "explanation" text 
);

create table "game_state" (
  "id" int primary key,
  "correct_answers" int default 0 not null,
  "incorrect_answers" int default 0 not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "single_row_lock" check (id = 1) 
);

insert into "game_state" (id, correct_answers, incorrect_answers) values (1, 0, 0);

alter table "questions" replica identity full;
alter table "game_state" replica identity full;

alter publication supabase_realtime add table "questions", "game_state";