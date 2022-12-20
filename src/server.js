import app from './app';
import { portNumber } from './config';
import { logInfo } from './middleware/logging';
import { startSqsConsumer } from './services/sqs/sqs-consumer';

app.listen(portNumber, () => logInfo(`Listening on port ${portNumber}`));
startSqsConsumer();
