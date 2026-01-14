import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { useOwnerGuard } from '@/hooks/useOwnerGuard';
import { AuditLogViewer } from '@/components/audit/AuditLogViewer';
import { Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function AuditLog() {
  const isOwner = useOwnerGuard();
  const { loading } = useAuth();
  
  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-96 bg-muted rounded" />
          </div>
        </div>
      </AppLayout>
    );
  }
  
  if (!isOwner) {
    return (
      <AppLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
          <Shield className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground text-center max-w-md">
            The Audit Log is only accessible to business owners. This page shows a complete record of all system changes and user actions.
          </p>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <PageHeader
          title="Audit Log"
          description="Complete record of all system changes and user actions across your business"
        />
        
        <AuditLogViewer fullPage />
      </div>
    </AppLayout>
  );
}
