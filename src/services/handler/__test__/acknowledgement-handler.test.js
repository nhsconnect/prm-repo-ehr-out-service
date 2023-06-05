import { parseAcknowledgementMessage } from "../../parser/acknowledgement-parser";
import { acknowledgementMessageHandler } from "../acknowledgement-handler";
import { parseConversationId } from "../../parser/parsing-utilities";
import { logError, logInfo } from "../../../middleware/logging";
import expect from "expect";

// Mocking
jest.mock('../../../middleware/logging');
jest.mock('../../parser/parsing-utilities');
jest.mock('../../parser/acknowledgement-parser');

describe('acknowledgement-handler.test.js', () => {
    // ============ COMMON PROPERTIES ============
    const CONVERSATION_ID = '63C1E862-8891-43E0-A53D-95EB5FCE1F08';
    const LOG_MESSAGE = 'NEGATIVE ACKNOWLEDGEMENT RECEIVED';
    // =================== END ===================

    it('should handle a negative acknowledgement with typecode AR successfully', async () => {
        // given
        const acknowledgementMessage = {
            acknowledgementTypeCode: 'AR'
        };

        // when
        parseConversationId.mockResolvedValueOnce(Promise.resolve(CONVERSATION_ID));
        parseAcknowledgementMessage.mockResolvedValueOnce(Promise.resolve(acknowledgementMessage));

        await acknowledgementMessageHandler(acknowledgementMessage);

        // then
        expect(logInfo).toHaveBeenCalledTimes(1);
        expect(logInfo).toHaveBeenCalledWith(LOG_MESSAGE);
    });

    it('should handle a negative acknowledgement with typecode AE successfully', async () => {
        // given
        const acknowledgementMessage = {
            acknowledgementTypeCode: 'AE'
        };

        // when
        parseConversationId.mockResolvedValueOnce(Promise.resolve(CONVERSATION_ID));
        parseAcknowledgementMessage.mockResolvedValueOnce(Promise.resolve(acknowledgementMessage));

        await acknowledgementMessageHandler(acknowledgementMessage);

        // then
        expect(logInfo).toHaveBeenCalledTimes(1);
        expect(logInfo).toHaveBeenCalledWith(LOG_MESSAGE);
    });

    it('should handle an unknown acknowledgement typecode successfully', async () => {
        // given
        const acknowledgementMessage = {
            acknowledgementTypeCode: 'XY'
        };

        // when
        parseConversationId.mockResolvedValueOnce(Promise.resolve(CONVERSATION_ID));
        parseAcknowledgementMessage.mockResolvedValueOnce(Promise.resolve(acknowledgementMessage));

        await acknowledgementMessageHandler(acknowledgementMessage);

        // then
        expect(logError).toHaveBeenCalledTimes(1);
        expect(logError).toHaveBeenCalledWith('ACKNOWLEDGEMENT TYPE XY IS UNKNOWN.');
    });
});
