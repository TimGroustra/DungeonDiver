ALTER TABLE leaderboard
ADD CONSTRAINT unique_player_score_deaths UNIQUE (player_name, score_time, deaths);