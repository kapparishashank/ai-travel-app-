export type AdminDashboardData = {
  role: 'admin' | 'support' | 'viewer';
  metrics: {
    userCount: number;
    tripCount: number;
    notificationFailures: number;
    activePriceAlerts: number;
    systemHealth: 'healthy' | 'degraded' | 'mock';
  };
  aiGenerationErrors: Array<Record<string, any>>;
  reportedRecommendations: Array<Record<string, any>>;
  safetyDataReports: Array<Record<string, any>>;
  providerHealth: Array<{
    provider: string;
    feature: string;
    status: string;
    last_checked_at: string;
    message?: string | null;
  }>;
};
