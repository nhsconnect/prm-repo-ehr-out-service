import express from 'express';
import swaggerUi from 'swagger-ui-express';

import { middleware } from './middleware/logging';
import healthCheck from './api/health-check';
import swaggerDocument from './swagger.json';

const app = express();
app.use(express.json());

app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/health', middleware, healthCheck);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

export default app;
