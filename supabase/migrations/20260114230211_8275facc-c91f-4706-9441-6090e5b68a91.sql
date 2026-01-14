-- Add audit triggers for tables not currently being tracked

-- Trigger for consignment_settlements
CREATE TRIGGER audit_consignment_settlements
  AFTER INSERT OR UPDATE OR DELETE ON public.consignment_settlements
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- Trigger for part_exchanges
CREATE TRIGGER audit_part_exchanges
  AFTER INSERT OR UPDATE OR DELETE ON public.part_exchanges
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- Trigger for cash_drawer_movements
CREATE TRIGGER audit_cash_drawer_movements
  AFTER INSERT OR UPDATE OR DELETE ON public.cash_drawer_movements
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- Trigger for commission_payments
CREATE TRIGGER audit_commission_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.commission_payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- Trigger for expense_templates
CREATE TRIGGER audit_expense_templates
  AFTER INSERT OR UPDATE OR DELETE ON public.expense_templates
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- Trigger for product_documents
CREATE TRIGGER audit_product_documents
  AFTER INSERT OR UPDATE OR DELETE ON public.product_documents
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- Trigger for supplier_documents
CREATE TRIGGER audit_supplier_documents
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_documents
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- Trigger for locations
CREATE TRIGGER audit_locations
  AFTER INSERT OR UPDATE OR DELETE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- Trigger for customer_preferences
CREATE TRIGGER audit_customer_preferences
  AFTER INSERT OR UPDATE OR DELETE ON public.customer_preferences
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- Trigger for profiles (track role changes, etc.)
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();