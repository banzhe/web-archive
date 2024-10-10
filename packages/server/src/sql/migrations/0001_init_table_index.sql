-- Migration number: 0001 	 2024-10-10T12:01:33.394Z
CREATE INDEX IF NOT EXISTS idx_pages_id ON pages(id);
CREATE INDEX IF NOT EXISTS idx_pages_pageUrl ON pages(pageUrl);
CREATE INDEX IF NOT EXISTS idx_pages_folderId ON pages(folderId);
CREATE INDEX IF NOT EXISTS idx_folders_id ON folders(id);