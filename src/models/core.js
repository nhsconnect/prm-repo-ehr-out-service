import { RecordType } from '../constants/enums';

export const isCore = (dynamoDbItem) => {
  return dynamoDbItem?.Layer?.startsWith(RecordType.CORE);
};
