-- Drop the existing insert policy which may be misconfigured.
DROP POLICY IF EXISTS "Allow public insert access for leaderboard" ON public.leaderboard;

-- Create a new, correct policy that allows anyone to insert scores.
CREATE POLICY "Allow public insert access for leaderboard" ON public.leaderboard FOR INSERT WITH CHECK (true);