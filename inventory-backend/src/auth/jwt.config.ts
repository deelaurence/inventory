export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'default-secret',
  expiresIn: '24h' as const,
};
