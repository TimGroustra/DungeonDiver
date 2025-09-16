-- Drop the faulty policy that was preventing inserts.
DROP POLICY "Users can insert their own leaderboard entries." ON public.leaderboard;

-- Create a new, correct policy that allows anyone to insert scores.
CREATE POLICY "Allow public insert access for leaderboard" ON public.leaderboard FOR INSERT WITH CHECK (true);