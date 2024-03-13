import {
  TransactWriteCommand,
  QueryCommand,
  GetCommand,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb';

import { logError, logInfo } from '../../../middleware/logging';
import { QueryKeyType, RecordType } from '../../../constants/enums';
import { getDynamodbClient } from './dynamodb-client';
import { IS_IN_LOCAL } from '../../../utilities/integration-test-utilities';
import { buildBaseQueryParams } from '../../../utilities/dynamodb-helper';

export class EhrTransferTracker {
  /**
   * An abstract layer for accessing the EhrTransferTracker table on dynamodb.
   *
   * Due to singleton nature, this class is NOT supposed to be instantiated by `new EhrTransferTracker()`.
   * Please call the class method `getInstance()` instead.
   */
  constructor() {
    if (EhrTransferTracker._instance) {
      throw new Error("Singleton classes can't be instantiated more than once.");
    }
    EhrTransferTracker._instance = this;

    this.tableName = process.env.DYNAMODB_NAME;

    if (IS_IN_LOCAL) {
      // for running integration test within IDE
      this.tableName = this.tableName ?? 'local-test-db';
    }

    this.client = getDynamodbClient();
  }

  static getInstance() {
    /**
     * Return the existing instance of this class. Create a new one if no instances was created before.
     * This is the supposed way to use this class.
     */
    if (this._instance) {
      return this._instance;
    }
    return new this();
  }

  async writeItemsInTransaction(items) {
    logInfo(`Writing ${items.length} items to dynamodb table`);
    if (!items || !Array.isArray(items)) {
      throw new TypeError('The given argument `items` is not an array');
    }

    const command = new TransactWriteCommand({
      TransactItems: items.map(item => ({
        Put: {
          TableName: this.tableName,
          Item: item
        }
      }))
    });

    await this.client.send(command);
  }

  async updateSingleItem(updateParams) {
    logInfo(`Updating dynamodb record with params: ${updateParams}`);
    const command = new UpdateCommand({
      TableName: this.tableName,
      ...updateParams
    });
    await this.client.send(command);
  }

  async updateItemsInTransaction(updateParams) {
    if (!updateParams || !Array.isArray(updateParams)) {
      throw new TypeError('The given argument `updateParams` is not an array');
    }

    logInfo(`Updating dynamodb record with params: ${updateParams}`);
    const command = new TransactWriteCommand({
      TransactItems: updateParams.map(params => ({
        Update: {
          TableName: this.tableName,
          ...params
        }
      }))
    });

    await this.client.send(command);
  }

  async queryTable(baseQueryParams, recordType = RecordType.ALL, includeDeletedRecord = false) {
    const params = { ...baseQueryParams, TableName: this.tableName };

    if (!includeDeletedRecord) {
      params.FilterExpression = 'attribute_not_exists(DeletedAt)';
    }

    switch (recordType) {
      case RecordType.ALL:
        break;
      case RecordType.CONVERSATION:
      case RecordType.CORE:
      case RecordType.FRAGMENT:
        params.ExpressionAttributeNames['#sortKey'] = 'Layer';
        params.ExpressionAttributeValues[':sortKey'] = recordType;
        params.KeyConditionExpression += ' AND begins_with(#sortKey, :sortKey)';
        break;
      default:
        logInfo(`Received unexpected queryType: ${recordType}. Will treat it as 'ALL'.`);
    }

    logInfo(`Running a query to dynamodb table with below params: ${params}`);
    const command = new QueryCommand(params);

    const response = await this.client.send(command);
    const items = response?.Items;
    if (!items) {
      logError('Received an empty response from dynamodb during query');
      return [];
    }
    return items;
  }

  async queryTableByNhsNumber(nhsNumber, includeDeletedRecord = false) {
    const baseQueryParams = buildBaseQueryParams(nhsNumber, QueryKeyType.NhsNumber);

    // Note: 2nd argument for below call should fixed as RecordType.ALL,
    // As dynamodb currently does not support GSI query with sort key in key condition filter
    return this.queryTable(baseQueryParams, RecordType.ALL, includeDeletedRecord);
  }

  async queryTableByOutboundConversationId(outboundConversationId, includeDeletedRecord = false) {
    const baseQueryParams = buildBaseQueryParams(
      outboundConversationId,
      QueryKeyType.OutboundConversationId
    );
    return this.queryTable(baseQueryParams, RecordType.ALL, includeDeletedRecord);
  }

  async queryTableByInboundConversationId(
    inboundConversationId,
    recordType = RecordType.ALL,
    includeDeletedRecord = false
  ) {
    const baseQueryParams = buildBaseQueryParams(
      inboundConversationId,
      QueryKeyType.InboundConversationId
    );
    return this.queryTable(baseQueryParams, recordType, includeDeletedRecord);
  }

  async getItemByKey(inboundConversationId, inboundMessageId, recordType) {
    const expectedTypes = [RecordType.CORE, RecordType.FRAGMENT];

    if (!expectedTypes.includes(recordType)) {
      throw new Error('recordType has to be either Core or Fragment');
    }
    if (!inboundConversationId && !inboundMessageId) {
      throw new Error('must be called with both conversationId and inboundMessageId');
    }

    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        InboundConversationId: inboundConversationId,
        Layer: `${recordType}#${inboundMessageId}`
      }
    });

    logInfo(
      `Running a getItem action with below key: ${{
        inboundConversationId,
        layer: recordType,
        inboundMessageId
      }}`
    );
    const response = await this.client.send(command);

    if (!response?.Item) {
      logError('Received an empty response from dynamodb during getItem');
    }
    return response?.Item ?? null;
  }
}
