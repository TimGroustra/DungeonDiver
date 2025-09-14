-- Add the 'deaths' column to the leaderboard table
ALTER TABLE public.leaderboard
ADD COLUMN deaths INT DEFAULT 0;

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their own leaderboard entries." ON public.leaderboard;

-- Recreate the INSERT policy to allow authenticated users to insert entries, including the new 'deaths' column.
CREATE POLICY "Users can insert their own leaderboard entries." ON public.leaderboard
FOR INSERT TO authenticated WITH CHECK (true);