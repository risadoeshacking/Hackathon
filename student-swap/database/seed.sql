-- Seed Data for Student Swap

-- Insert school
INSERT INTO schools (name, email_domain) VALUES
  ('Rosmini College', 'rosmini.school.nz')
ON CONFLICT (email_domain) DO NOTHING;

-- Insert categories
INSERT INTO categories (name, slug, icon) VALUES
  ('Uniforms', 'uniforms', '👕'),
  ('Textbooks', 'textbooks', '📚'),
  ('Sports Gear', 'sports-gear', '⚽'),
  ('Electronics', 'electronics', '💻'),
  ('Stationery', 'stationery', '✏️'),
  ('Bags & Accessories', 'bags-accessories', '🎒'),
  ('Musical Instruments', 'musical-instruments', '🎸'),
  ('Art Supplies', 'art-supplies', '🎨'),
  ('Other', 'other', '📦')
ON CONFLICT (slug) DO NOTHING;

-- Insert admin user (password: Admin1234!)
-- bcrypt hash of 'Admin1234!'
INSERT INTO users (school_id, email, password_hash, full_name, role) VALUES
  (1, 'admin@rosmini.school.nz', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/iFxpyKoRQS3PnNxVm', 'Admin User', 'admin')
ON CONFLICT (email) DO NOTHING;
