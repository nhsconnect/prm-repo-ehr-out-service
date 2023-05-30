import { parseCommonAcknowledgementFields } from "../parser/acknowledgement-parser";
import { setCurrentSpanAttributes } from "../../config/tracing";
import { logError, logInfo } from "../../middleware/logging";
import {
  parseConversationId
} from "../parser/parsing-utilities";

const POSITIVE_ACKNOWLEDGEMENTS = ['AA'];
const NEGATIVE_ACKNOWLEDGEMENTS = ['AE', 'AR'];

export const acknowledgementMessageHandler = async message => {
  const conversationId = await parseConversationId(message);
  const commonFields = await parseCommonAcknowledgementFields(message);

  setCurrentSpanAttributes({ conversationId });

  switch (commonFields.ackTypeCode) {
    case POSITIVE_ACKNOWLEDGEMENTS.includes(commonFields.ackTypeCode):
      // TODO: This falls within the scope of another ticket.
      break;
    case NEGATIVE_ACKNOWLEDGEMENTS.includes(commonFields.ackTypeCode):
      logInfo(`NEGATIVE ACKNOWLEDGEMENT RECEIVED IN RESPONSE TO MESSAGE ID ${commonFields.referencedMessageId}`);

      /*
        fields required for acknowledgement table
        messageId (UNIQUE TO ACK MESSAGE)
        conversationId (ASSUMED TO BE THE CONVO ID IN RESPONSE)

        referencedMessageId (MID IN RESPONSE)
        typeCode
        RSONS (MAY OR MAY NOT BE PRESENT) (can't recall name array of failure reasons)
          EITHER:
            1. acknowledgement -> acknowledgementDetail -> code -> (attr) displayName
            2.
       */



      // Add a new row to the message acknowledgement tracking (TODO) database table.
      break;
    default:
      logError(`ACKNOWLEDGEMENT TYPE ${commonFields.ackTypeCode} IS UNKNOWN.`);
      break;
  }
};