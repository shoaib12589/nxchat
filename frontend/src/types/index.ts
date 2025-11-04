// User types
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'super_admin' | 'company_admin' | 'agent' | 'customer';
  tenant_id?: number;
  department_id?: number;
  status: 'active' | 'inactive' | 'suspended';
  email_verified: boolean;
  avatar?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  company?: Company;
  department?: Department;
  agentSettings?: AgentSetting;
}

// Company types
export interface Company {
  id: number;
  name: string;
  plan_id: number;
  status: 'pending' | 'active' | 'suspended' | 'cancelled';
  storage_used: number;
  created_at: string;
  updated_at: string;
  plan?: Plan;
  users?: User[];
  departments?: Department[];
  chats?: Chat[];
  triggers?: Trigger[];
  tickets?: Ticket[];
  widgetSettings?: WidgetSetting;
  brands?: Brand[];
}

// Plan types
export interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_cycle: 'monthly' | 'yearly';
  max_agents: number;
  max_brands: number;
  max_departments: number;
  max_storage: number;
  max_ai_messages: number;
  allows_calls: boolean;
  ai_enabled: boolean;
  analytics_enabled: boolean;
  features: string[] | Record<string, any>;
  is_active: boolean;
  stripe_price_id?: string;
  billing_interval: 'month' | 'year';
  created_at: string;
  updated_at: string;
}

// Department types
export interface Department {
  id: number;
  name: string;
  description?: string;
  tenant_id: number;
  created_at: string;
  updated_at: string;
  company?: Company;
  users?: User[];
  chats?: Chat[];
  tickets?: Ticket[];
}

// Chat types
export interface Chat {
  id: number;
  tenant_id: number;
  customer_id?: number;
  agent_id?: number;
  department_id?: number;
  status: 'waiting' | 'active' | 'closed' | 'transferred' | 'completed' | 'visitor_left';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  subject?: string;
  started_at?: string;
  ended_at?: string;
  rating?: number;
  rating_feedback?: string;
  created_at: string;
  updated_at: string;
  customer?: User;
  agent?: User;
  department?: Department;
  messages?: Message[];
  callSessions?: CallSession[];
  // Fields from Chat model that may exist even without customer_id
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
}

// Message types
export interface Message {
  id: number;
  chat_id: number;
  sender_id: number;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  chat?: Chat;
  sender?: User;
}

// Ticket types
export interface Ticket {
  id: number;
  tenant_id: number;
  customer_id: number;
  agent_id?: number;
  department_id?: number;
  subject: string;
  description: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  customer?: User;
  agent?: User;
  department?: Department;
  metadata?: {
    notes?: Array<{
      id: string;
      content: string;
      author: string;
      createdAt: string;
      type: 'reply' | 'note';
    }>;
    [key: string]: any;
  };
}

// Trigger types
export interface Trigger {
  id: number;
  tenant_id: number;
  name: string;
  description?: string;
  trigger_type: 'keyword' | 'time' | 'behavior' | 'page_view';
  conditions: Record<string, any>;
  actions: Record<string, any>;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Agent Setting types
export interface AgentSetting {
  id: number;
  agent_id: number;
  notification_sound: string;
  notification_volume: number;
  notification_preferences: {
    new_chat: boolean;
    new_message: boolean;
    chat_transfer: boolean;
    ai_alert: boolean;
    ticket_assigned: boolean;
    system_announcement: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  language: string;
  auto_accept_chats: boolean;
  max_concurrent_chats: number;
  ai_suggestions_enabled: boolean;
  grammar_check_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Widget Setting types
export interface WidgetSetting {
  id: number;
  tenant_id: number;
  theme_color: string;
  position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  welcome_message: string;
  logo_url?: string;
  enable_audio: boolean;
  enable_video: boolean;
  enable_file_upload: boolean;
  ai_enabled: boolean;
  ai_personality: string;
  auto_transfer_keywords: string[];
  ai_welcome_message?: string;
  offline_message: string;
  custom_css?: string;
  custom_js?: string;
  created_at: string;
  updated_at: string;
}

// Call Session types
export interface CallSession {
  id: number;
  chat_id: number;
  initiator_id: number;
  participant_id: number;
  status: 'initiated' | 'ringing' | 'active' | 'ended';
  duration?: number;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
  chat?: Chat;
  initiator?: User;
  participant?: User;
}

// Notification types
export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  action_url?: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

// Brand types
export interface Brand {
  id: number;
  tenant_id: number;
  name: string;
  description?: string;
  logo?: string;
  primary_color: string;
  secondary_color: string;
  status: 'active' | 'inactive';
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
  company?: Company;
  widgetKeys?: WidgetKey[];
  agents?: User[];
}

export interface BrandAgent {
  id: number;
  brand_id: number;
  agent_id: number;
  assigned_by?: number;
  status: 'active' | 'inactive';
  assigned_at: string;
  brand?: Brand;
  agent?: User;
  assignedBy?: User;
}

export interface WidgetKey {
  id: number;
  tenant_id: number;
  brand_id?: number;
  key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  company?: Company;
  brand?: Brand;
}

// System Setting types
export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  description: string;
  category: 'general' | 'security' | 'email' | 'system' | 'storage' | 'ai' | 'payment' | 'features';
  is_encrypted: boolean;
  updated_by: number;
  created_at: string;
  updated_at: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  company_name: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    refresh_token: string;
  };
}

// Dashboard types
export interface DashboardStats {
  totalCompanies?: number;
  totalUsers?: number;
  activeChats?: number;
  totalMessages?: number;
  totalRevenue?: number;
  totalAgents?: number;
  totalTickets?: number;
  averageResponseTime?: number;
  customerSatisfaction?: number;
  activeAgents?: number;
  recentChats?: Chat[];
  recentTickets?: Ticket[];
  trends?: {
    chats?: number;
    tickets?: number;
  };
  aiMessages?: {
    used: number;
    limit: number;
    usagePercentage: number;
  };
}

export interface AnalyticsData {
  period: string;
  newCompanies?: number;
  newUsers?: number;
  totalChats?: number;
  totalMessages?: number;
  averageResponseTime?: number;
  customerSatisfaction?: number;
  revenue?: number;
}

// Socket types
export interface SocketMessage {
  id: string;
  chat_id: number;
  sender_id: number;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  created_at: string;
  sender?: User;
}

export interface SocketNotification {
  id: string;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}
