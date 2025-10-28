import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, AuthResponse, LoginRequest, RegisterRequest } from '@/types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
              const response = await axios.post(
                `${this.client.defaults.baseURL}/auth/refresh-token`,
                { refresh_token: refreshToken }
              );

              const { token } = response.data.data;
              localStorage.setItem('token', token);
              
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, clear tokens but don't redirect automatically
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            console.error('Token refresh failed:', refreshError);
            // Let the calling code handle the redirect
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.client.post('/auth/login', credentials);
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.client.post('/auth/register', userData);
    return response.data;
  }

  async logout(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post('/auth/logout');
    return response.data;
  }

  async forgotPassword(email: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post('/auth/reset-password', { token, password });
    return response.data;
  }

  async getProfile(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/auth/me');
    return response.data;
  }

  async updateProfile(data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put('/auth/profile', data);
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  }

  // Super Admin endpoints
  async getSuperAdminDashboard(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/superadmin/dashboard');
    return response.data;
  }

  async getCompanies(params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/superadmin/companies', { params });
    return response.data;
  }

  async createCompany(data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post('/superadmin/companies', data);
    return response.data;
  }

  async updateCompany(id: number, data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put(`/superadmin/companies/${id}`, data);
    return response.data;
  }

  async deleteCompany(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.delete(`/superadmin/companies/${id}`);
    return response.data;
  }

  async updateCompanyStatus(id: number, status: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put(`/superadmin/companies/${id}/status`, { status });
    return response.data;
  }

  // Brand management methods
  async getBrands(params?: { page?: number; limit?: number; search?: string; status?: string }): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/brands', { params });
    return response.data;
  }

  async getBrand(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get(`/brands/${id}`);
    return response.data;
  }

  async createBrand(data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post('/brands', data);
    return response.data;
  }

  async updateBrand(id: number, data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put(`/brands/${id}`, data);
    return response.data;
  }

  async deleteBrand(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.delete(`/brands/${id}`);
    return response.data;
  }

  async getAvailableAgents(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/brands/available-agents');
    return response.data;
  }

  async assignAgentsToBrand(brandId: number, agentIds: number[]): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post(`/brands/${brandId}/assign-agents`, {
      agentIds
    });
    return response.data;
  }

  async generateBrandWidgetKey(brandId: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post(`/brands/${brandId}/generate-widget-key`);
    return response.data;
  }

  async getPlans(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/superadmin/plans');
    return response.data;
  }

  async getCompanyPlans(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/company/plans');
    return response.data;
  }

  async getBillingPlans(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/stripe/plans');
    return response.data;
  }

  async createCheckoutSession(planId: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post('/stripe/create-checkout-session', {
      plan_id: planId
    });
    return response.data;
  }

  async updateCompanyPlan(planId: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put('/company/plan', {
      plan_id: planId
    });
    return response.data;
  }

  // Stripe payment methods
  async createSubscription(data: { plan_id: number; payment_method_id: string }): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post('/stripe/create-subscription', data);
    return response.data;
  }

  async getSubscription(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/stripe/subscription');
    return response.data;
  }

  async updateSubscription(newPlanId: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put('/stripe/update-subscription', {
      new_plan_id: newPlanId
    });
    return response.data;
  }

  async cancelSubscription(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.delete('/stripe/cancel-subscription');
    return response.data;
  }

  async getInvoices(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/stripe/invoices');
    return response.data;
  }

  async createPortalSession(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post('/stripe/portal-session');
    return response.data;
  }

  async createPlan(data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post('/superadmin/plans', data);
    return response.data;
  }

  async updatePlan(id: number, data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put(`/superadmin/plans/${id}`, data);
    return response.data;
  }

  async deletePlan(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.delete(`/superadmin/plans/${id}`);
    return response.data;
  }

  async getSystemSettings(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/superadmin/settings');
    return response.data;
  }

  async updateSystemSettings(data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put('/superadmin/settings', data);
    return response.data;
  }

  async getAnalytics(period?: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/superadmin/analytics', { params: { period } });
    return response.data;
  }

  // Company Admin endpoints
  async getCompanySettings(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/company/settings');
    return response.data;
  }

  async updateCompanySettings(data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put('/company/settings', data);
    return response.data;
  }

  // Agent endpoints
  async getAgentSettings(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/agent/settings');
    return response.data;
  }

  async updateAgentSettings(data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put('/agent/settings', data);
    return response.data;
  }

  // Company Admin endpoints
  async getCompanyDashboard(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/company/dashboard');
    return response.data;
  }

  async getAgents(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/company/agents');
    return response.data;
  }

  async createAgent(data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post('/company/agents', data);
    return response.data;
  }

  async updateAgent(id: number, data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put(`/company/agents/${id}`, data);
    return response.data;
  }

  async deleteAgent(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.delete(`/company/agents/${id}`);
    return response.data;
  }

  async getDepartments(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/company/departments');
    return response.data;
  }

  async createDepartment(data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post('/company/departments', data);
    return response.data;
  }

  async updateDepartment(id: number, data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put(`/company/departments/${id}`, data);
    return response.data;
  }

  async deleteDepartment(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.delete(`/company/departments/${id}`);
    return response.data;
  }

  async getCompanyInfo(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/company/info');
    return response.data;
  }

  async getUsageStats(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/company/usage');
    return response.data;
  }

  async getWidgetSettings(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/company/widget');
    return response.data;
  }

  // AI Training endpoints
  async getAITrainingDocs(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/company/ai-training');
    return response.data;
  }

  // Visitor management endpoints
  async getVisitors(params?: { status?: string; device?: string; search?: string; page?: number; limit?: number }): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/agent/visitors', { params });
    return response.data;
  }

  async getVisitor(id: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get(`/agent/visitors/${id}`);
    return response.data;
  }

  async assignVisitorToAgent(visitorId: string, agentId: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put(`/agent/visitors/${visitorId}/assign`, { agentId });
    return response.data;
  }

  async updateVisitorStatus(visitorId: string, status: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put(`/agent/visitors/${visitorId}/status`, { status });
    return response.data;
  }

  async updateVisitorNotes(visitorId: string, notes: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put(`/agent/visitors/${visitorId}/notes`, { notes });
    return response.data;
  }

  // Chat monitoring endpoints for company admin
  async getCompanyChats(params?: { agentId?: number; status?: string; limit?: number }): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/company/chats', { params });
    return response.data;
  }

  async getChatById(chatId: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get(`/company/chats/${chatId}`);
    return response.data;
  }

  // Trigger suggestions for agents
  async searchTriggers(searchText: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post('/agent/triggers/search', { searchText });
    return response.data;
  }

  // Super admin visitor management endpoints
  async getSuperAdminVisitors(params?: { status?: string; device?: string; search?: string; page?: number; limit?: number; companyId?: string }): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/superadmin/visitors', { params });
    return response.data;
  }

  async createAITrainingDoc(data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post('/company/ai-training', data);
    return response.data;
  }

  async updateAITrainingDoc(id: number, data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put(`/company/ai-training/${id}`, data);
    return response.data;
  }

  async deleteAITrainingDoc(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.delete(`/company/ai-training/${id}`);
    return response.data;
  }

  async getAITrainingStats(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/company/ai-training/stats');
    return response.data;
  }

  async processAITrainingDoc(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post(`/company/ai-training/${id}/process`);
    return response.data;
  }

  async processAllAITrainingDocs(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post('/company/ai-training/process-all');
    return response.data;
  }

  // ==================== AGENT TRIGGERS ====================

  async getAgentTriggers(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/agent/triggers');
    return response.data;
  }

  async createAgentTrigger(data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post('/agent/triggers', data);
    return response.data;
  }

  async updateAgentTrigger(id: number, data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put(`/agent/triggers/${id}`, data);
    return response.data;
  }

  async deleteAgentTrigger(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.delete(`/agent/triggers/${id}`);
    return response.data;
  }

  async toggleAgentTrigger(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.patch(`/agent/triggers/${id}/toggle`);
    return response.data;
  }

  async getAgentTriggerStats(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/agent/triggers/stats');
    return response.data;
  }

  async updateWidgetSettings(data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put('/company/widget', data);
    return response.data;
  }

  async getTriggers(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/company/triggers');
    return response.data;
  }

  async createTrigger(data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post('/company/triggers', data);
    return response.data;
  }

  async updateTrigger(id: number, data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put(`/company/triggers/${id}`, data);
    return response.data;
  }

  async deleteTrigger(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.delete(`/company/triggers/${id}`);
    return response.data;
  }

  async getCompanyAnalytics(period?: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/company/analytics', { params: { period } });
    return response.data;
  }

  // Agent endpoints
  async getChats(params?: { status?: string; page?: number; limit?: number }): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/agent/chats', { params });
    return response.data;
  }

  async getChat(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get(`/agent/chats/${id}`);
    return response.data;
  }

  async getChatHistory(params?: { 
    page?: number; 
    limit?: number; 
    status?: string; 
    startDate?: string; 
    endDate?: string; 
    search?: string; 
    sortBy?: string; 
    sortOrder?: string; 
  }): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/agent/history', { params });
    return response.data;
  }

  async assignChat(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put(`/agent/chats/${id}/assign`);
    return response.data;
  }

  async transferChat(id: number, newAgentId: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put(`/agent/chats/${id}/transfer`, { agentId: newAgentId });
    return response.data;
  }

  async endChat(id: number, rating?: number, feedback?: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put(`/agent/chats/${id}/end`, { rating, feedback });
    return response.data;
  }

  async getTickets(params?: { status?: string; priority?: string; page?: number; limit?: number }): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/agent/tickets', { params });
    return response.data;
  }

  async getTicket(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get(`/agent/tickets/${id}`);
    return response.data;
  }

  async createTicket(data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post('/agent/tickets', data);
    return response.data;
  }

  async updateTicket(id: number, data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put(`/agent/tickets/${id}`, data);
    return response.data;
  }

  async assignTicket(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put(`/agent/tickets/${id}/assign`);
    return response.data;
  }

  // Agent status endpoints
  async updateAgentStatus(presenceStatus: 'online' | 'away' | 'invisible'): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put('/agent/status', { presence_status: presenceStatus });
    return response.data;
  }

  async getAgentStatus(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/agent/status');
    return response.data;
  }

  async getAgentsStatus(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/agent/agents/status');
    return response.data;
  }

  async getAgentWorkload(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/agent/workload');
    return response.data;
  }

  async uploadFile(file: File): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response: AxiosResponse<ApiResponse> = await this.client.post('/agent/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Generic HTTP methods
  async get(url: string, config?: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get(url, config);
    return response.data;
  }

  async post(url: string, data?: any, config?: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post(url, data, config);
    return response.data;
  }

  async put(url: string, data?: any, config?: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put(url, data, config);
    return response.data;
  }

  async delete(url: string, config?: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.delete(url, config);
    return response.data;
  }

  // Email Templates endpoints
  async getEmailTemplates(params?: { page?: number; limit?: number; type?: string; search?: string; is_active?: string }): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/email-templates', { params });
    return response.data;
  }

  async getEmailTemplate(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get(`/email-templates/${id}`);
    return response.data;
  }

  async createEmailTemplate(data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post('/email-templates', data);
    return response.data;
  }

  async updateEmailTemplate(id: number, data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.put(`/email-templates/${id}`, data);
    return response.data;
  }

  async deleteEmailTemplate(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.delete(`/email-templates/${id}`);
    return response.data;
  }

  async toggleEmailTemplate(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.patch(`/email-templates/${id}/toggle`);
    return response.data;
  }

  async duplicateEmailTemplate(id: number, name?: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post(`/email-templates/${id}/duplicate`, { name });
    return response.data;
  }

  async testEmailTemplate(id: number, testEmail: string, variables?: Record<string, any>): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.post(`/email-templates/${id}/test`, { test_email: testEmail, variables });
    return response.data;
  }

  async getEmailTemplateVariables(type: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.client.get(`/email-templates/types/${type}/variables`);
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
