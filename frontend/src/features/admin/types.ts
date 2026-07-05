export type AdminDashboardRow = Record<string, string | number | boolean | null | undefined>;

export type AdminDashboardData = {
  role: 'admin' | 'support' | 'viewer';
  metrics: {
    userCount: number;
    tripCount: number;
    notificationFailures: number;
    activePriceAlerts: number;
    systemHealth: 'healthy' | 'degraded' | 'mock';
  };
  aiGenerationErrors: AdminDashboardRow[];
  reportedRecommendations: AdminDashboardRow[];
  safetyDataReports: AdminDashboardRow[];
  providerHealth: {
    provider: string;
    feature: string;
    status: string;
    last_checked_at: string;
    message?: string | null;
  }[];
};
