import app from './app';
import { portNumber } from './config';
import { logInfo } from './middleware/logging';
import { startSqsConsumer } from './services/sqs/sqs-consumer';

let serviceStartedTimestamp;

app.listen(portNumber, () => {
  serviceStartedTimestamp = Date.now();
  logInfo(`The EHR Out Service is now listening on port ${portNumber} for incoming connections.`);
  startSqsConsumer();
});

export const getServiceStartedTimestamp = () => serviceStartedTimestamp;
