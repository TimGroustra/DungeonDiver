DELETE FROM leaderboard
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER(PARTITION BY player_name, score_time, deaths ORDER BY id) as rn
        FROM leaderboard
    ) t
    WHERE t.rn > 1
);