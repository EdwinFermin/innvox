-- Apple Wallet device registrations for push updates
CREATE TABLE IF NOT EXISTS apple_wallet_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_library_id TEXT NOT NULL,
  push_token TEXT NOT NULL,
  pass_type_id TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (device_library_id, pass_type_id, serial_number)
);

CREATE INDEX IF NOT EXISTS idx_apple_wallet_devices_serial
  ON apple_wallet_devices (pass_type_id, serial_number);
