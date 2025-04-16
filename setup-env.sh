#!/bin/bash

# Prompt for configuration
read -p "Enter API URL (default: http://23.22.63.50:8000/api): " API_URL
read -p "Enter domain name (leave empty if none): " DOMAIN_NAME
read -p "Enter email (for SSL certificate): " EMAIL

# Set default API URL if not provided
API_URL=${API_URL:-"http://23.22.63.50:8000/api"}

# Export variables
export API_URL
export DOMAIN_NAME
export EMAIL

# Create .env.production file
cat > .env.production << EOL
NEXT_PUBLIC_API_URL="${API_URL}"
NODE_ENV="production"
EOL

echo "Environment variables have been set up successfully!"
echo "You can now run ./deploy.sh to deploy your application." 