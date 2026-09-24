alter table public.learning_sessions
      add column summary text,
      add column skills_practiced text,
      add column positive_point text,
      add column improvement_point text,
      add column next_recommendation text;
  ;