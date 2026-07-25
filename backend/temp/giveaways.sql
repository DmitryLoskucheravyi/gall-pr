CREATE TABLE giveaways (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  painting_id INT NOT NULL,
  deadline DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_giveaways_painting FOREIGN KEY (painting_id) REFERENCES paintings(id) ON DELETE CASCADE
);

CREATE TABLE giveaway_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  giveaway_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_giveaway_user (giveaway_id, user_id),
  CONSTRAINT fk_giveaway_participants_giveaway FOREIGN KEY (giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE,
  CONSTRAINT fk_giveaway_participants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
