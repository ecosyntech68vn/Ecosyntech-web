# .env validation
# The following is an example .env file with validation rules

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASS=password
DB_NAME=database_name

# Validation script to check .env variables
import os

required_env_vars = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME']

for var in required_env_vars:
    if var not in os.environ:
        raise EnvironmentError(f"Missing required environment variable: {var}")
