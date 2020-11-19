import app from './app';
import { portNumber } from './config';

app.listen(3000, () => console.log(`Listening on port ${portNumber}`));
