import { RecordType } from '../constants/enums';
import { isFragment } from './fragment';

export const isCore = dynamoDbItem => {
  return dynamoDbItem?.Layer?.startsWith(RecordType.CORE);
};

export const isCoreOrFragment = dynamoDbItem => {
  return isCore(dynamoDbItem) || isFragment(dynamoDbItem);
};
