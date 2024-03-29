/**
 * @deprecated
 * to be deleted in PRMT-4588
 */
const use_ssl = process.env.USE_SSL_FOR_DB === 'true';
const use_rds_credentials = process.env.USE_AWS_RDS_CREDENTIALS === 'true';

const databaseConfig = {
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  host: process.env.DATABASE_HOST,
  dialect: 'postgres',
  logging: false,
  use_rds_credentials,
  pool: {
    max: 30,
  }
};

if (use_ssl) {
  databaseConfig.ssl = use_ssl;
  databaseConfig.dialectOptions = {
    // see https://node-postgres.com/features/ssl
    ssl: {
      rejectUnauthorized: false
    }
  };
}

// module.exports = databaseConfig;
