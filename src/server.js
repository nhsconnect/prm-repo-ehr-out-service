import app from './app';
import { portNumber } from './config';
import { logEvent } from './middleware/logging';

app.listen(portNumber, () => logEvent(`Listening on port ${portNumber}`));
