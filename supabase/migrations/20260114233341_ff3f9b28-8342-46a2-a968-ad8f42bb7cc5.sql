-- Add audit triggers to tables not currently tracked

-- Part Exchanges - Track trade-in intake and status changes
CREATE TRIGGER trg_audit_part_exchanges
AFTER INSERT OR UPDATE OR DELETE ON public.part_exchanges
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- Consignment Settlements - Track consignment payouts
CREATE TRIGGER trg_audit_consignment_settlements
AFTER INSERT OR UPDATE OR DELETE ON public.consignment_settlements
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- Commission Payments - Track staff commission payments
CREATE TRIGGER trg_audit_commission_payments
AFTER INSERT OR UPDATE OR DELETE ON public.commission_payments
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- Cash Drawer Movements - Track all cash drawer activity
CREATE TRIGGER trg_audit_cash_drawer_movements
AFTER INSERT OR UPDATE OR DELETE ON public.cash_drawer_movements
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- Product Documents - Track document uploads/changes
CREATE TRIGGER trg_audit_product_documents
AFTER INSERT OR UPDATE OR DELETE ON public.product_documents
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- Supplier Documents - Track supplier document changes
CREATE TRIGGER trg_audit_supplier_documents
AFTER INSERT OR UPDATE OR DELETE ON public.supplier_documents
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- Customer Preferences - Track customer preference updates
CREATE TRIGGER trg_audit_customer_preferences
AFTER INSERT OR UPDATE OR DELETE ON public.customer_preferences
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- App Settings - Track business settings changes
CREATE TRIGGER trg_audit_app_settings
AFTER INSERT OR UPDATE OR DELETE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- Locations - Track location changes
CREATE TRIGGER trg_audit_locations
AFTER INSERT OR UPDATE OR DELETE ON public.locations
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- Profiles - Track profile changes (name, role changes)
CREATE TRIGGER trg_audit_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();