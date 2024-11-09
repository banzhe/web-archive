SELECT 
  id
FROM pages
WHERE id IN (
    SELECT value FROM json_each((SELECT pageIds FROM tags WHERE id = 1))
);
