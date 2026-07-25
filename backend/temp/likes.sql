ALTER TABLE paintings ADD COLUMN likes_count INT NOT NULL DEFAULT 0;

CREATE TABLE likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  painting_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_painting (user_id, painting_id),
  CONSTRAINT fk_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_likes_painting FOREIGN KEY (painting_id) REFERENCES paintings(id) ON DELETE CASCADE
);
