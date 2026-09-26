-- Harden exposed SECURITY DEFINER RPC privileges.
-- All listed functions derive identity from auth.uid(), so anonymous execution is unnecessary.
-- Keep authenticated access because these RPCs are called either directly by the signed-in client
-- or by Edge Functions forwarding the user's bearer token.

revoke execute on function public.authorize_musiclab_track(integer) from public, anon;
revoke execute on function public.get_account_access() from public, anon;
revoke execute on function public.get_coach_memory_context() from public, anon;
revoke execute on function public.get_lab_insights(text) from public, anon;
revoke execute on function public.get_musiclab_adaptive_cue() from public, anon;
revoke execute on function public.get_progress_access_data() from public, anon;
revoke execute on function public.record_conversation_progress(integer) from public, anon;
revoke execute on function public.release_coach_usage() from public, anon;
revoke execute on function public.release_voice_usage(integer) from public, anon;
revoke execute on function public.reserve_coach_usage() from public, anon;
revoke execute on function public.reserve_voice_usage(integer) from public, anon;
revoke execute on function public.upsert_coach_learning_plan(text,text,text,text,text,text,integer) from public, anon;

grant execute on function public.authorize_musiclab_track(integer) to authenticated, service_role;
grant execute on function public.get_account_access() to authenticated, service_role;
grant execute on function public.get_coach_memory_context() to authenticated, service_role;
grant execute on function public.get_lab_insights(text) to authenticated, service_role;
grant execute on function public.get_musiclab_adaptive_cue() to authenticated, service_role;
grant execute on function public.get_progress_access_data() to authenticated, service_role;
grant execute on function public.record_conversation_progress(integer) to authenticated, service_role;
grant execute on function public.release_coach_usage() to authenticated, service_role;
grant execute on function public.release_voice_usage(integer) to authenticated, service_role;
grant execute on function public.reserve_coach_usage() to authenticated, service_role;
grant execute on function public.reserve_voice_usage(integer) to authenticated, service_role;
grant execute on function public.upsert_coach_learning_plan(text,text,text,text,text,text,integer) to authenticated, service_role;
