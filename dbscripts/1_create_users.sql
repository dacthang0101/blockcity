CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE,                       -- optional: dùng cho login truyền thống
  password TEXT,                              -- optional: null nếu login qua OAuth
  email TEXT UNIQUE,                          -- dùng làm định danh chính (Google/Facebook)
  provider TEXT,                              -- 'local', 'google', 'facebook', etc.
  provider_id TEXT,                           -- ID từ nhà cung cấp OAuth
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
