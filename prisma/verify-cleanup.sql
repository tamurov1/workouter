select 'User' as table_name, count(*) as rows from "public"."User"
union all
select 'Session', count(*) from "public"."Session"
union all
select 'Group', count(*) from "public"."Group"
union all
select 'GroupMember', count(*) from "public"."GroupMember"
union all
select 'GroupJoinRequest', count(*) from "public"."GroupJoinRequest"
union all
select 'Workout', count(*) from "public"."Workout"
union all
select 'WorkoutExercise', count(*) from "public"."WorkoutExercise"
union all
select 'WorkoutCompletion', count(*) from "public"."WorkoutCompletion";
