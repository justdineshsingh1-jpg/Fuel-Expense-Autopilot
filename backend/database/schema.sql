CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('field_executive', 'team_leader', 'manager', 'managing_director', 'accounts')),
    department VARCHAR(100),
    reporting_to UUID REFERENCES users(id),
    shift_start_time TIME DEFAULT '09:00',
    shift_end_time TIME DEFAULT '18:00',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trip_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_reading NUMERIC(10,1) NOT NULL,
    end_reading NUMERIC(10,1) NOT NULL,
    distance_km NUMERIC(10,1) GENERATED ALWAYS AS (end_reading - start_reading) STORED,
    start_odometer_image_url TEXT NOT NULL,
    end_odometer_image_url TEXT NOT NULL,
    start_reading_ocr NUMERIC(10,1),
    end_reading_ocr NUMERIC(10,1),
    start_capture_timestamp TIMESTAMPTZ NOT NULL,
    end_capture_timestamp TIMESTAMPTZ NOT NULL,
    start_lat DOUBLE PRECISION,
    start_lng DOUBLE PRECISION,
    end_lat DOUBLE PRECISION,
    end_lng DOUBLE PRECISION,
    osrm_calculated_km NUMERIC(10,1),
    variance_percent NUMERIC(5,2),
    approval_status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('draft', 'submitted', 'tl_pending', 'tl_approved', 'mgr_pending', 'mgr_approved', 'md_pending', 'md_approved', 'accounts_pending', 'accounts_approved', 'rejected')),
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_readings CHECK (end_reading > start_reading),
    UNIQUE (user_id, log_date)
);

CREATE TABLE trip_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_log_id UUID NOT NULL REFERENCES trip_logs(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    client_name VARCHAR(200) NOT NULL,
    visit_purpose TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address_text TEXT,
    arrival_timestamp TIMESTAMPTZ NOT NULL,
    departure_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fuel_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_log_id UUID NOT NULL REFERENCES trip_logs(id) ON DELETE CASCADE,
    bill_image_url TEXT NOT NULL,
    bill_amount NUMERIC(10,2) NOT NULL,
    fuel_type VARCHAR(20) DEFAULT 'petrol' CHECK (fuel_type IN ('petrol', 'diesel', 'cng', 'ev_charge')),
    liters NUMERIC(8,2),
    ocr_detected_amount NUMERIC(10,2),
    pump_name VARCHAR(200),
    capture_lat DOUBLE PRECISION,
    capture_lng DOUBLE PRECISION,
    capture_timestamp TIMESTAMPTZ NOT NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE approvals_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_log_id UUID NOT NULL REFERENCES trip_logs(id),
    approver_id UUID NOT NULL REFERENCES users(id),
    approval_level VARCHAR(20) NOT NULL CHECK (approval_level IN ('team_leader', 'manager', 'managing_director', 'accounts')),
    action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected', 'returned', 'flagged')),
    comments TEXT,
    approved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fraud_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_log_id UUID NOT NULL REFERENCES trip_logs(id),
    flag_type VARCHAR(50) NOT NULL CHECK (flag_type IN ('excess_variance', 'odometer_mismatch', 'after_shift_capture', 'ocr_reading_mismatch', 'continuous_reading_break', 'suspicious_location', 'duplicate_bill')),
    severity VARCHAR(10) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    auto_detected BOOLEAN DEFAULT true,
    executive_explanation TEXT,
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE monthly_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    total_distance_km NUMERIC(10,1),
    total_fuel_amount NUMERIC(10,2),
    total_working_days INTEGER,
    flagged_entries_count INTEGER DEFAULT 0,
    approval_status VARCHAR(30) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, month, year)
);

CREATE INDEX idx_trip_logs_user_id ON trip_logs(user_id);
CREATE INDEX idx_trip_logs_status ON trip_logs(approval_status);
CREATE INDEX idx_trip_logs_date ON trip_logs(log_date);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_trips_modtime BEFORE UPDATE ON trip_logs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
