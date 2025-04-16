// Configuration constants for the application
// Centralizes all environment variables and provides defaults/validation

export const config = {
  aws: {
    region: process.env.NEXT_PUBLIC_AWS_REGION || '',
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
    bucketName: process.env.NEXT_PUBLIC_AWS_BUCKET_NAME || '',
  },
  api: {
    host: process.env.NEXT_PUBLIC_API_HOST || '52.201.125.3:8000',
    defaultApiKey: process.env.NEXT_PUBLIC_DEFAULT_API_KEY || 'Da8j-Sj5B-9uSk-K4S6-So6j-kdk8-aai3-O2jP',
  }
};

// Validation function to check if AWS config is valid
export function isAwsConfigValid(): boolean {
  const { region, accessKeyId, secretAccessKey, bucketName } = config.aws;
  return !!(region && accessKeyId && secretAccessKey && bucketName);
}

// Log configuration status on load (without sensitive values)
console.log('App Configuration Status:', {
  awsConfigured: isAwsConfigValid(),
  apiHostConfigured: !!config.api.host,
});

// Export individual configs for convenience
export const awsConfig = config.aws;
export const apiConfig = config.api; 