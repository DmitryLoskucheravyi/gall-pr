CREATE TABLE mail_outbox (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  kind            VARCHAR(64)  NOT NULL,
  to_email        VARCHAR(255) NOT NULL,
  subject         VARCHAR(255) NOT NULL,
  text_body       TEXT         NOT NULL,
  html_body       MEDIUMTEXT   NOT NULL,
  order_id        INT          NULL,
  status          VARCHAR(16)  NOT NULL DEFAULT 'pending',
  attempts        INT          NOT NULL DEFAULT 0,
  last_error      TEXT         NULL,
  next_attempt_at DATETIME     NOT NULL,
  sent_at         DATETIME     NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_due (status, next_attempt_at),
  INDEX idx_order_kind (order_id, kind)
);
