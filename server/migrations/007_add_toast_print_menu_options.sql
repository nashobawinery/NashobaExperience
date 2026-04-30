ALTER TABLE toast_menu_embed_configs
  ADD COLUMN IF NOT EXISTS custom_title text,
  ADD COLUMN IF NOT EXISTS item_print_styles text,
  ADD COLUMN IF NOT EXISTS hide_course_headings boolean DEFAULT false;
