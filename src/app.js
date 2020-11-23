import express from 'express';
import swaggerUi from 'swagger-ui-express';

import healthCheck from './api/health-check';
import swaggerDocument from './swagger.json';

const app = express();
app.use(express.json());

app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/health', healthCheck);

app.use((err, req, res) => {
  res.status(500).json({ error: err.message });
});

export default app;
