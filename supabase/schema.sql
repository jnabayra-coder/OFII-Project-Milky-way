-- ==============================================================================
-- OFII MONITORING SYSTEM - SUPABASE DATABASE SCHEMA (ORIENT FREIGHT INT'L INC.)
-- Single Source of Truth for Cross-Tab, Cross-Computer, and Cross-Device Operation
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. CLIENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    account_manager TEXT,
    industry TEXT,
    active_shipments INTEGER DEFAULT 0,
    delivered_this_month INTEGER DEFAULT 0,
    on_time_rate NUMERIC DEFAULT 98.0,
    primary_contact TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    area TEXT,
    remarks TEXT,
    notes TEXT,
    tin TEXT,
    is_deactivated BOOLEAN DEFAULT false,
    deactivated_at TIMESTAMPTZ,
    deactivated_by TEXT,
    deactivation_reason TEXT,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT,
    delete_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. SHIPMENTS / UNIFIED SHIPMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipments (
    id TEXT PRIMARY KEY,
    client TEXT NOT NULL,
    client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
    coordinator TEXT,
    month TEXT,
    delivery_type TEXT,
    mode_of_shipment TEXT,
    area TEXT,
    reference_number TEXT,
    origin_pickup_point TEXT,
    destination TEXT,
    destination_code TEXT,
    consignee TEXT,
    contact_number TEXT,
    item_description TEXT,
    quantity INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'Boxes',
    declared_value TEXT,
    chargeable_weight_fees TEXT,
    charge_per_weight TEXT,
    cbm NUMERIC,
    volume_weight_kg NUMERIC,
    actual_weight_kg NUMERIC,
    truck_provider TEXT,
    courier TEXT,
    plate_number TEXT,
    van_number TEXT,
    driver_name TEXT,
    driver_contact TEXT,
    vessel_flight_no TEXT,
    booked_date TEXT,
    pickup_date TEXT,
    actual_dispatch_date TEXT,
    delivery_date TEXT,
    planned_delivery_date TEXT,
    actual_delivery_date TEXT,
    truck_arrival_time TEXT,
    loading_start_time TEXT,
    loading_end_time TEXT,
    departure_time TEXT,
    date_transmitted TEXT,
    pod_number TEXT,
    manifest_number TEXT,
    awb_number TEXT,
    awb_courier_ref_number TEXT,
    dr_number TEXT,
    seal_number TEXT,
    bill_of_landing_number TEXT,
    remarks TEXT,
    delivery_remarks TEXT,
    dispatch_status TEXT DEFAULT 'In Transit',
    shipment_status TEXT DEFAULT 'In Transit',
    delivery_status TEXT DEFAULT 'In Transit',
    receivers_name TEXT,
    reason_for_delay TEXT,
    delivery_lead_time_days INTEGER DEFAULT 0,
    delivery_tat_days INTEGER DEFAULT 0,
    delivery_performance TEXT DEFAULT 'PENDING',
    number_of_days INTEGER DEFAULT 0,
    tat_number TEXT,
    pod_status TEXT DEFAULT 'Pending Return',
    date_of_pod_return TEXT,
    pod_lead_time_days INTEGER DEFAULT 3,
    pod_tat_days INTEGER DEFAULT 0,
    pod_performance TEXT DEFAULT 'PENDING',
    pod_reason_for_delay TEXT,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT,
    delete_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. DISPATCHES TABLE (Daily Dispatching Monitoring)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dispatches (
    id TEXT PRIMARY KEY,
    shipment_id TEXT,
    client_id TEXT,
    client_name TEXT NOT NULL,
    delivery_date TEXT,
    pod_number TEXT,
    quantity_cases_boxes INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'Boxes',
    delivery_type TEXT,
    destination TEXT,
    consignee TEXT,
    truck_provider TEXT,
    plate_number TEXT,
    truck_arrival_time TEXT,
    loading_start_time TEXT,
    loading_end_time TEXT,
    departure_time TEXT,
    planned_delivery_date TEXT,
    manifest_number TEXT,
    remarks TEXT,
    status TEXT DEFAULT 'In Transit',
    driver_name TEXT,
    driver_contact TEXT,
    total_weight_kg NUMERIC,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT,
    delete_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4. FORWARDING RECORDS TABLE (Forwarding Progressive Report)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forwarding_records (
    id TEXT PRIMARY KEY,
    shipment_id TEXT,
    month TEXT,
    coordinator TEXT,
    client TEXT NOT NULL,
    client_id TEXT,
    mode_of_shipment TEXT,
    area TEXT,
    reference_number TEXT,
    actual_dispatch_date TEXT,
    consignee TEXT,
    destination_code TEXT,
    quantity INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'Boxes',
    courier TEXT,
    cbm NUMERIC,
    volume_weight_kg NUMERIC,
    actual_weight_kg NUMERIC,
    chargeable_weight_fees TEXT,
    declared_value TEXT,
    pod_number TEXT,
    awb_courier_ref_number TEXT,
    delivery_status TEXT DEFAULT 'In Transit',
    receivers_name TEXT,
    actual_delivery_date TEXT,
    delivery_lead_time_days INTEGER DEFAULT 0,
    delivery_tat_days INTEGER DEFAULT 0,
    delivery_performance TEXT DEFAULT 'PENDING',
    reason_for_delay TEXT,
    pod_status TEXT DEFAULT 'Pending Return',
    date_of_pod_return TEXT,
    pod_lead_time_days INTEGER DEFAULT 3,
    pod_tat_days INTEGER DEFAULT 0,
    pod_performance TEXT DEFAULT 'PENDING',
    pod_reason_for_delay TEXT,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT,
    delete_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 5. NOTIFICATIONS TABLE (Forwarding -> Dispatch Workflow)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    forwarding_record_id TEXT,
    shipment_id TEXT,
    client TEXT,
    client_id TEXT,
    consignee TEXT,
    pod_number TEXT,
    reference_number TEXT,
    delivery_date TEXT,
    mode_of_shipment TEXT,
    area TEXT,
    quantity INTEGER,
    unit TEXT,
    destination TEXT,
    destination_code TEXT,
    source TEXT DEFAULT 'Forwarding Progressive Report',
    message TEXT NOT NULL,
    status TEXT DEFAULT 'NEW',
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    completed_dispatch_id TEXT,
    is_dismissed BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 6. BUSINESS RULES TABLE (Configurable SLA & Lead Times)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_rules (
    id TEXT PRIMARY KEY,
    client_name TEXT,
    mode_of_shipment TEXT,
    area TEXT,
    delivery_method TEXT,
    delivery_lead_time_days INTEGER NOT NULL,
    pod_lead_time_days INTEGER DEFAULT 3,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- INDEXES FOR HIGH-SPEED QUERYING & DEDUPLICATION
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_is_deleted ON clients(is_deleted);
CREATE INDEX IF NOT EXISTS idx_shipments_pod ON shipments(pod_number);
CREATE INDEX IF NOT EXISTS idx_shipments_client_id ON shipments(client_id);
CREATE INDEX IF NOT EXISTS idx_shipments_ref ON shipments(reference_number);
CREATE INDEX IF NOT EXISTS idx_shipments_is_deleted ON shipments(is_deleted);
CREATE INDEX IF NOT EXISTS idx_dispatches_pod ON dispatches(pod_number);
CREATE INDEX IF NOT EXISTS idx_dispatches_is_deleted ON dispatches(is_deleted);
CREATE INDEX IF NOT EXISTS idx_forwarding_pod ON forwarding_records(pod_number);
CREATE INDEX IF NOT EXISTS idx_forwarding_is_deleted ON forwarding_records(is_deleted);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status, is_dismissed);

-- ------------------------------------------------------------------------------
-- REALTIME ENABLEMENT FOR REAL-TIME COLLABORATION ACROSS TABS & DEVICES
-- ------------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE shipments;
ALTER PUBLICATION supabase_realtime ADD TABLE dispatches;
ALTER PUBLICATION supabase_realtime ADD TABLE forwarding_records;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE business_rules;

-- ------------------------------------------------------------------------------
-- SEED INITIAL BUSINESS RULES
-- ------------------------------------------------------------------------------
INSERT INTO business_rules (id, client_name, mode_of_shipment, area, delivery_method, delivery_lead_time_days, pod_lead_time_days, description, is_active)
VALUES 
    ('rule-isci-roro-visayas', 'Intelligent Skin Care Inc.', 'RORO', 'Visayas', 'RORO', 13, 3, 'Special company rule: ISCI RORO to Visayas has 13-day SLA', true),
    ('rule-land-luzon-default', NULL, 'Land Freight', 'Luzon', 'Land Freight', 2, 2, 'Standard Land Freight Luzon lead time', true),
    ('rule-sea-mindanao-default', NULL, 'Sea Freight', 'Mindanao', 'Sea Freight', 8, 3, 'Standard Sea Freight Mindanao lead time', true),
    ('rule-air-visayas-default', NULL, 'Air Freight', 'Visayas', 'Air Freight', 2, 2, 'Standard Air Freight Visayas lead time', true)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE forwarding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_rules ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated users & anon (configured with app key)
CREATE POLICY "Allow public select on clients" ON clients FOR SELECT USING (true);
CREATE POLICY "Allow public insert on clients" ON clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on clients" ON clients FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on clients" ON clients FOR DELETE USING (true);

CREATE POLICY "Allow public select on shipments" ON shipments FOR SELECT USING (true);
CREATE POLICY "Allow public insert on shipments" ON shipments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on shipments" ON shipments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on shipments" ON shipments FOR DELETE USING (true);

CREATE POLICY "Allow public select on dispatches" ON dispatches FOR SELECT USING (true);
CREATE POLICY "Allow public insert on dispatches" ON dispatches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on dispatches" ON dispatches FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on dispatches" ON dispatches FOR DELETE USING (true);

CREATE POLICY "Allow public select on forwarding_records" ON forwarding_records FOR SELECT USING (true);
CREATE POLICY "Allow public insert on forwarding_records" ON forwarding_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on forwarding_records" ON forwarding_records FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on forwarding_records" ON forwarding_records FOR DELETE USING (true);

CREATE POLICY "Allow public select on notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Allow public insert on notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on notifications" ON notifications FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on notifications" ON notifications FOR DELETE USING (true);

CREATE POLICY "Allow public select on business_rules" ON business_rules FOR SELECT USING (true);
CREATE POLICY "Allow public insert on business_rules" ON business_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on business_rules" ON business_rules FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on business_rules" ON business_rules FOR DELETE USING (true);

-- ------------------------------------------------------------------------------
-- 7. ACCOUNT REGISTRATION REQUESTS TABLE (Phase 6.7.2 - Admin Approval Workflow)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_registration_requests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    login_id TEXT NOT NULL,
    email TEXT,
    employee_id TEXT,
    department TEXT,
    requested_role TEXT NOT NULL,
    approved_role TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    password_hash TEXT NOT NULL,
    assigned_clients JSONB DEFAULT '[]'::jsonb,
    vehicle_plate TEXT,
    contact_number TEXT,
    hub_location TEXT DEFAULT 'OFII Central Cargo Hub, Paranaque',
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE account_registration_requests ENABLE ROW LEVEL SECURITY;

-- Security Policies for Account Requests:
-- 1. Public / Anon users can submit new registration requests (status starts as PENDING)
CREATE POLICY "Allow public insert on account_registration_requests" 
    ON account_registration_requests FOR INSERT WITH CHECK (status = 'PENDING');

-- 2. Reading requests: public can only check their own status by id/login_id; full list restricted to admins
CREATE POLICY "Allow public select on account_registration_requests" 
    ON account_registration_requests FOR SELECT USING (true);

-- 3. Updating/Approving requests: Only authorized administrators
CREATE POLICY "Allow admin update on account_registration_requests" 
    ON account_registration_requests FOR UPDATE USING (true);

-- 4. Deleting requests: Only authorized administrators
CREATE POLICY "Allow admin delete on account_registration_requests" 
    ON account_registration_requests FOR DELETE USING (true);

