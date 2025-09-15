-- Old Project: Drop token-gating table and policies
DROP POLICY IF EXISTS "Deny anon access" ON public.gates;
DROP TABLE IF EXISTS public.gates;

-- Old Project: Drop creator profiles table and policies
DROP POLICY IF EXISTS "Deny all access to creator_profiles" ON public.creator_profiles;
DROP TABLE IF EXISTS public.creator_profiles;

-- Old Project: Drop ETN (web3) leaderboard table and policies
DROP POLICY IF EXISTS "ETN leaderboard entries are viewable by everyone." ON public.etn_leaderboard;
DROP POLICY IF EXISTS "Users can insert their own ETN leaderboard entry." ON public.etn_leaderboard;
DROP TABLE IF EXISTS public.etn_leaderboard;