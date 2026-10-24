-- "Continue with Google" login alongside phone + OTP (docs/functions/login/desc.md). Additive only: two new
-- columns and an index; no existing column or row changes.
-- users.google_sub: Google's stable account id ("sub" claim). One InspiState account per Google account.
-- users.google_email: the verified Google email the account last signed in with (shown to admins).
-- users.phone stays NOT NULL UNIQUE: an account created with Google stores the placeholder 'g:<google_sub>' until
-- the owner adds a mobile number. The placeholder never matches a real number (login only accepts 10 digits).
ALTER TABLE users ADD COLUMN google_sub TEXT;
ALTER TABLE users ADD COLUMN google_email TEXT;
CREATE UNIQUE INDEX idx_users_google_sub ON users (google_sub) WHERE google_sub IS NOT NULL;
