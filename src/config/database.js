const use_ssl = process.env.USE_SSL_FOR_DB === 'true';
const databaseConfig = {
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  host: process.env.DATABASE_HOST,
  dialect: 'postgres',
  logging: true,
  ssl: use_ssl,
  native: use_ssl,
  dialectOptions: {
    ssl: use_ssl ? 'require' : 'false'
  }
};

module.exports = databaseConfig;
