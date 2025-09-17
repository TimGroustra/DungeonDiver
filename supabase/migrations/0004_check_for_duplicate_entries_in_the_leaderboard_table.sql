SELECT player_name, score_time, deaths, COUNT(*)
FROM leaderboard
GROUP BY player_name, score_time, deaths
HAVING COUNT(*) > 1;