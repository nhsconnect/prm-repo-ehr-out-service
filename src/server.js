import app from './app';
import { portNumber, serviceStartedTimestamp } from './config';
import { logInfo } from './middleware/logging';
import { startSqsConsumer } from './services/sqs/sqs-consumer';

app.listen(portNumber, () => {
  serviceStartedTimestamp = Date.now();
  logInfo(`The EHR Out Service is now listening on port ${portNumber} for incoming connections.`);
  startSqsConsumer();
});