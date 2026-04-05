-- Collapse about/links content types into a single "page" type
UPDATE content SET type = 'page' WHERE type IN ('about', 'links');

-- Clear dead Hugo shortcode bodies from photo posts (never rendered, just noise)
UPDATE content SET body = '' WHERE type = 'photo' AND body LIKE '%{{<%';
