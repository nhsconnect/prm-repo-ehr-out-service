import Sequelize from 'sequelize';
import { initializeConfig } from '../config';
import * as models from './models';
import { Signer } from 'aws-sdk/clients/rds';
import { logError, logInfo } from '../middleware/logging';

class ModelFactory {
  constructor() {
    this.db = {};
    this.sequelize = {};
    this.config = initializeConfig().sequelize;
    this._resetConfig();
  }

  _overrideConfig(key, value) {
    this.base_config[key] = value;
    this.configure();
  }

  _resetConfig() {
    this.base_config = this.config;
    this.configure();
  }

  configure() {
    if (this.sequelize instanceof Sequelize) {
      this.sequelize.close();
    }

    let signer;
    if (this.base_config.use_rds_credentials) {
      signer = new Signer({
        region: 'eu-west-2',
        username: this.base_config.username,
        hostname: this.base_config.host,
        port: 5432
      });

      this.base_config.password = signer.getAuthToken();
    }

    this.sequelize = new Sequelize(
      this.base_config.database,
      this.base_config.username,
      this.base_config.password,
      this.base_config
    );

    if (this.base_config.use_rds_credentials) {
      this.sequelize.beforeConnect(config => {
        config.password = signer.getAuthToken();
      });
    }

    this.sequelize
      .authenticate()
      .then(() => logInfo('DB Connection has been established successfully.'))
      .catch(e => logError('Unable to connect to the database:', e));

    this.reload_models();
  }

  reload_models() {
    this.db = {};

    for (const m in models) {
      const model = models[m](this.sequelize, Sequelize.DataTypes);
      this.db[model.name] = model;
    }

    Object.keys(this.db).forEach(modelName => {
      if (this.db[modelName].associate) {
        this.db[modelName].associate(this.db);
      }
    });

    this.db.sequelize = this.sequelize;
    this.db.Sequelize = Sequelize;
  }

  getByName(moduleName) {
    return this.db[moduleName];
  }
}

export default new ModelFactory();
