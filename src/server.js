import app from './app';
import { portNumber } from './config';
import { logInfo } from './middleware/logging';

app.listen(portNumber, () => logInfo(`Listening on port ${portNumber}`));
