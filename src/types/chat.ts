// Chat Types for RAG Chatbot

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface ChartData {
  type: 'bar' | 'pie' | 'line';
  title: string;
  data: ChartDataPoint[];
  dataKey?: string;
  nameKey?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  chart?: ChartData;
  timestamp: Date;
}

export interface ChatSource {
  table: string;
  id: string;
  similarity?: number;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  conversationId: string;
  sources: ChatSource[];
  chart?: ChartData;
  error?: string;
}

export interface ChatState {
  messages: ChatMessage[];
  conversationId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface SuggestedQuery {
  label: string;
  query: string;
  icon?: string;
}

// Suggested queries for quick actions
export const SUGGESTED_QUERIES: SuggestedQuery[] = [
  {
    label: "Today's sales",
    query: "What are today's sales so far?",
    icon: "receipt",
  },
  {
    label: "Low stock",
    query: "Which products are low in stock?",
    icon: "alert-triangle",
  },
  {
    label: "Top customers",
    query: "Who are my top VIP customers?",
    icon: "crown",
  },
  {
    label: "Inventory value",
    query: "What is my current inventory value?",
    icon: "package",
  },
  {
    label: "Recent expenses",
    query: "Show me recent expenses by category",
    icon: "credit-card",
  },
  {
    label: "Consignments",
    query: "What consignment items do I have?",
    icon: "handshake",
  },
];

// Helper to extract name from email
export function extractNameFromEmail(email: string): string {
  const localPart = email.split('@')[0];
  // Replace dots, underscores, numbers with spaces and capitalize
  const name = localPart
    .replace(/[._]/g, ' ')
    .replace(/\d+/g, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
  return name || 'there';
}
