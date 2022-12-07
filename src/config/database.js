const use_ssl = process.env.USE_SSL_FOR_DB === 'true';
const use_rds_credentials = process.env.REPO_TO_GP_USE_AWS_RDS_CREDENTIALS === 'true';

const databaseConfig = {
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  host: process.env.DATABASE_HOST,
  dialect: 'postgres',
  logging: false,
  use_rds_credentials
};

if (use_ssl) {
  databaseConfig.ssl = use_ssl;
  databaseConfig.dialectOptions = {
    // see https://node-postgres.com/features/ssl
    ssl: {
      rejectUnauthorized: true
    }
  };
}

module.exports = databaseConfig;
