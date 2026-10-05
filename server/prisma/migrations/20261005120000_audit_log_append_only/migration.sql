-- Make the AuditLog table append-only at the database level.
-- Rows may be inserted and read, but any attempt to modify or remove them
-- (from the API, Prisma Studio, or a raw SQL session) is rejected.

CREATE OR REPLACE FUNCTION audit_log_reject_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

-- Row-level: blocks UPDATE and DELETE (including ON DELETE SET NULL cascades,
-- so users and attempts with audit history cannot be hard-deleted; deactivate instead)
CREATE TRIGGER "AuditLog_no_update_delete"
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION audit_log_reject_modification();

-- Statement-level: TRUNCATE bypasses row triggers, so block it separately
CREATE TRIGGER "AuditLog_no_truncate"
BEFORE TRUNCATE ON "AuditLog"
FOR EACH STATEMENT EXECUTE FUNCTION audit_log_reject_modification();
