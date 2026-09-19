-- ============================================================
-- GRAINRISE
-- MILLER MANAGER > BRANCH MANAGEMENT
-- FILE 03: SUPPLIER PROFILE / BRANCH STATUS
-- ============================================================
--
-- One Miller user may own many supplier_profiles.
--
-- Each supplier_profile represents one Miller operating
-- location / branch.
--
-- Therefore each profile needs its OWN lifecycle status.
--
-- users.status cannot be used for this because:
--
-- users.status
--     = status of the Miller ACCOUNT
--
-- supplier_profiles.status
--     = status of the individual Miller LOCATION / BRANCH
--
-- ============================================================


BEGIN;


-- ============================================================
-- 1. ADD PROFILE STATUS
-- ============================================================
--
-- Existing supplier profiles automatically become ACTIVE.
--
-- Current functional values:
--
-- active
-- inactive
--
-- We are intentionally NOT adding archived/deleted here yet
-- because current Branch Management UI only uses:
--
-- Active
-- Inactive
--
-- ============================================================

ALTER TABLE supplier_profiles

ADD COLUMN IF NOT EXISTS status VARCHAR(20)
    NOT NULL
    DEFAULT 'active';


-- ============================================================
-- 2. STATUS VALIDATION
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (

        SELECT 1

        FROM pg_constraint

        WHERE
            conname = 'chk_supplier_profiles_status'

            AND conrelid =
                'supplier_profiles'::regclass

    )
    THEN

        ALTER TABLE supplier_profiles

        ADD CONSTRAINT chk_supplier_profiles_status

        CHECK (
            status IN (
                'active',
                'inactive'
            )
        );

    END IF;

END
$$;


-- ============================================================
-- 3. MILLER + STATUS INDEX
-- ============================================================
--
-- Main Branch Management listing:
--
-- WHERE user_id = authenticated Miller
-- AND status = ...
--
-- ============================================================

CREATE INDEX IF NOT EXISTS
idx_supplier_profiles_user_status

ON supplier_profiles (
    user_id,
    status
);


-- ============================================================
-- 4. AUTOMATIC updated_at
-- ============================================================
--
-- supplier_profiles already has updated_at.
--
-- Make PostgreSQL responsible for maintaining it.
--
-- ============================================================

CREATE OR REPLACE FUNCTION
grainrise_supplier_profiles_set_updated_at()

RETURNS TRIGGER

LANGUAGE plpgsql

AS $$

BEGIN

    NEW.updated_at =
        CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$;


DROP TRIGGER IF EXISTS
trg_grainrise_supplier_profiles_updated_at
ON supplier_profiles;


CREATE TRIGGER
trg_grainrise_supplier_profiles_updated_at

BEFORE UPDATE
ON supplier_profiles

FOR EACH ROW

EXECUTE FUNCTION
grainrise_supplier_profiles_set_updated_at();


COMMIT;


-- ============================================================
-- 5. VERIFY COLUMN
-- ============================================================

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default

FROM information_schema.columns

WHERE
    table_schema = 'public'

    AND table_name = 'supplier_profiles'

ORDER BY
    ordinal_position;


-- ============================================================
-- 6. VERIFY STATUS CONSTRAINT
-- ============================================================

SELECT
    conname,
    pg_get_constraintdef(oid)
        AS definition

FROM pg_constraint

WHERE
    conrelid =
        'supplier_profiles'::regclass

    AND conname =
        'chk_supplier_profiles_status';


-- ============================================================
-- 7. VERIFY PROFILE / BRANCH DATA
-- ============================================================

SELECT
    supplier_profile_id,
    user_id,

    business_name,
    organization_name,

    province,
    municipality,
    postal_code,
    barangay,
    street_address,

    official_email,
    official_contact_number,

    status,

    created_at,
    updated_at

FROM supplier_profiles

ORDER BY
    user_id,
    supplier_profile_id;