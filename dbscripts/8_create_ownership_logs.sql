CREATE TABLE ownership_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  block_id INTEGER REFERENCES blocks(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('acquired', 'transferred', 'revoked')),
  purchase_block_id INTEGER REFERENCES purchase_blocks(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
