-- Run on postgres-production (orderdb) before deploying

CREATE TABLE IF NOT EXISTS lambda_users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pincodes (
  id         SERIAL PRIMARY KEY,
  pincode    VARCHAR(10) NOT NULL,
  city       VARCHAR(100),
  state      VARCHAR(100),
  created_by INTEGER REFERENCES lambda_users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
