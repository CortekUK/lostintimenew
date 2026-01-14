import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from 'react-day-picker';

export interface EnhancedAuditEntry {
  id: number;
  table_name: string;
  row_pk: string;
  action: 'insert' | 'update' | 'delete' | 'void';
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  actor_id?: string;
  actor_name?: string;
  actor_email?: string;
  actor_role?: string;
  occurred_at: string;
}

export interface AuditSummary {
  totalToday: number;
  totalThisWeek: number;
  mostActiveUser: { name: string; count: number } | null;
  mostChangedTable: { table: string; count: number } | null;
  recentDeletions: number;
  activityByUser: { name: string; inserts: number; updates: number; deletes: number }[];
}

interface UseAuditLogOptions {
  tableFilter?: string;
  actionFilter?: string;
  actorFilter?: string;
  searchQuery?: string;
  dateRange?: DateRange;
  limit?: number;
}

export function useAuditLog(options: UseAuditLogOptions = {}) {
  const {
    tableFilter = 'all',
    actionFilter = 'all',
    actorFilter = 'all',
    searchQuery = '',
    dateRange,
    limit = 200
  } = options;

  return useQuery({
    queryKey: ['audit-logs-enhanced', tableFilter, actionFilter, actorFilter, searchQuery, dateRange, limit],
    queryFn: async () => {
      // First fetch audit logs
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(limit);

      if (tableFilter !== 'all') {
        query = query.eq('table_name', tableFilter);
      }
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }
      if (dateRange?.from) {
        query = query.gte('occurred_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('occurred_at', dateRange.to.toISOString());
      }

      const { data: auditLogs, error: auditError } = await query;
      if (auditError) throw auditError;

      // Get unique actor IDs
      const actorIds = [...new Set(auditLogs?.map(log => log.actor).filter(Boolean) as string[])];
      
      // Fetch profiles for all actors
      let profiles: Record<string, { full_name: string; email: string; role: string }> = {};
      if (actorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, role')
          .in('user_id', actorIds);
        
        if (profilesData) {
          profiles = profilesData.reduce((acc, p) => {
            acc[p.user_id] = { 
              full_name: p.full_name || 'Unknown', 
              email: p.email || '', 
              role: p.role || 'staff' 
            };
            return acc;
          }, {} as Record<string, { full_name: string; email: string; role: string }>);
        }
      }

      // Enhance audit logs with actor details
      let enhancedLogs: EnhancedAuditEntry[] = (auditLogs || []).map(log => ({
        id: log.id,
        table_name: log.table_name,
        row_pk: log.row_pk,
        action: log.action as EnhancedAuditEntry['action'],
        old_data: log.old_data as Record<string, any> | undefined,
        new_data: log.new_data as Record<string, any> | undefined,
        actor_id: log.actor || undefined,
        actor_name: log.actor ? profiles[log.actor]?.full_name || 'Unknown User' : 'System',
        actor_email: log.actor ? profiles[log.actor]?.email : undefined,
        actor_role: log.actor ? profiles[log.actor]?.role : undefined,
        occurred_at: log.occurred_at
      }));

      // Apply actor filter
      if (actorFilter !== 'all') {
        enhancedLogs = enhancedLogs.filter(log => log.actor_id === actorFilter);
      }

      // Apply search filter
      if (searchQuery.trim()) {
        const search = searchQuery.toLowerCase();
        enhancedLogs = enhancedLogs.filter(log => 
          log.table_name.toLowerCase().includes(search) ||
          log.row_pk.toLowerCase().includes(search) ||
          log.actor_name?.toLowerCase().includes(search) ||
          log.action.toLowerCase().includes(search) ||
          JSON.stringify(log.new_data || {}).toLowerCase().includes(search) ||
          JSON.stringify(log.old_data || {}).toLowerCase().includes(search)
        );
      }

      return enhancedLogs;
    }
  });
}

export function useAuditSummary() {
  return useQuery({
    queryKey: ['audit-summary'],
    queryFn: async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();

      // Fetch recent logs for summary
      const { data: recentLogs, error } = await supabase
        .from('audit_log')
        .select('*')
        .gte('occurred_at', weekStart)
        .order('occurred_at', { ascending: false });

      if (error) throw error;

      // Get profiles for actor names
      const actorIds = [...new Set(recentLogs?.map(log => log.actor).filter(Boolean) as string[])];
      let profiles: Record<string, string> = {};
      
      if (actorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', actorIds);
        
        if (profilesData) {
          profiles = profilesData.reduce((acc, p) => {
            acc[p.user_id] = p.full_name || 'Unknown';
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Calculate stats
      const todayLogs = recentLogs?.filter(log => log.occurred_at >= todayStart) || [];
      const totalToday = todayLogs.length;
      const totalThisWeek = recentLogs?.length || 0;

      // Count by actor
      const actorCounts: Record<string, number> = {};
      const actorActivity: Record<string, { inserts: number; updates: number; deletes: number }> = {};
      
      recentLogs?.forEach(log => {
        if (log.actor) {
          actorCounts[log.actor] = (actorCounts[log.actor] || 0) + 1;
          
          if (!actorActivity[log.actor]) {
            actorActivity[log.actor] = { inserts: 0, updates: 0, deletes: 0 };
          }
          
          if (log.action === 'insert') actorActivity[log.actor].inserts++;
          else if (log.action === 'update') actorActivity[log.actor].updates++;
          else if (log.action === 'delete') actorActivity[log.actor].deletes++;
        }
      });

      // Most active user
      let mostActiveUser: { name: string; count: number } | null = null;
      const sortedActors = Object.entries(actorCounts).sort(([, a], [, b]) => b - a);
      if (sortedActors.length > 0) {
        const [actorId, count] = sortedActors[0];
        mostActiveUser = { name: profiles[actorId] || 'Unknown', count };
      }

      // Count by table
      const tableCounts: Record<string, number> = {};
      recentLogs?.forEach(log => {
        tableCounts[log.table_name] = (tableCounts[log.table_name] || 0) + 1;
      });

      // Most changed table
      let mostChangedTable: { table: string; count: number } | null = null;
      const sortedTables = Object.entries(tableCounts).sort(([, a], [, b]) => b - a);
      if (sortedTables.length > 0) {
        const [table, count] = sortedTables[0];
        mostChangedTable = { table, count };
      }

      // Recent deletions (today)
      const recentDeletions = todayLogs.filter(log => log.action === 'delete').length;

      // Activity by user
      const activityByUser = Object.entries(actorActivity).map(([actorId, activity]) => ({
        name: profiles[actorId] || 'Unknown',
        ...activity
      })).sort((a, b) => (b.inserts + b.updates + b.deletes) - (a.inserts + a.updates + a.deletes));

      return {
        totalToday,
        totalThisWeek,
        mostActiveUser,
        mostChangedTable,
        recentDeletions,
        activityByUser
      } as AuditSummary;
    },
    staleTime: 30000 // Refresh every 30 seconds
  });
}

export function useAuditActors() {
  return useQuery({
    queryKey: ['audit-actors'],
    queryFn: async () => {
      // Get unique actors from recent audit logs
      const { data: logs } = await supabase
        .from('audit_log')
        .select('actor')
        .order('occurred_at', { ascending: false })
        .limit(1000);

      const actorIds = [...new Set(logs?.map(l => l.actor).filter(Boolean) as string[])];
      
      if (actorIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, role')
        .in('user_id', actorIds);

      return (profiles || []).map(p => ({
        id: p.user_id,
        name: p.full_name || 'Unknown',
        role: p.role
      }));
    }
  });
}
