// Environment variable validation and type-safe access

const requiredEnvVars = [
  'MONGODB_URI',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL'
] as const;

type EnvVars = {
  MONGODB_URI: string;
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
};

class EnvironmentValidator {
  private validated = false;
  private env: Partial<EnvVars> = {};

  constructor() {
    this.validate();
  }

  private validate() {
    if (this.validated) return;

    const missingVars: string[] = [];

    for (const varName of requiredEnvVars) {
      const value = process.env[varName];
      if (!value) {
        missingVars.push(varName);
      } else {
        (this.env as any)[varName] = value;
      }
    }

    // Set NODE_ENV with default
    this.env.NODE_ENV = (process.env.NODE_ENV as any) || 'development';

    if (missingVars.length > 0 && this.env.NODE_ENV === 'production') {
      console.error('❌ Missing required environment variables:', missingVars.join(', '));
      console.error('Please check your .env file or Vercel environment settings');
      throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }

    // Validate format
    if (this.env.MONGODB_URI && !this.env.MONGODB_URI.startsWith('mongodb')) {
      throw new Error('MONGODB_URI must be a valid MongoDB connection string');
    }

    if (this.env.NEXTAUTH_SECRET && this.env.NEXTAUTH_SECRET.length < 32) {
      console.warn('⚠️ NEXTAUTH_SECRET should be at least 32 characters for security');
    }

    this.validated = true;
  }

  get(key: keyof EnvVars): string {
    this.validate();
    return this.env[key] || '';
  }

  getAll(): Partial<EnvVars> {
    this.validate();
    return this.env;
  }

  isDevelopment(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }
}

// Singleton instance
const env = new EnvironmentValidator();

export default env;