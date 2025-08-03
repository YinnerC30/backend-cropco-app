export interface TenantCredentials {
  username: string;
  password: string;
  database: string;
}

export interface TenantConnectionConfig {
  host: string;
  port: number;
  credentials: TenantCredentials;
} 