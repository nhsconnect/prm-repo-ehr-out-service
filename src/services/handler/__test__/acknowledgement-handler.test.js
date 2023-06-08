import { parseAcknowledgementMessage } from "../../parser/acknowledgement-parser";
import { createAcknowledgement } from "../../database/create-acknowledgement";
import { acknowledgementMessageHandler } from "../acknowledgement-handler";
import { parseConversationId } from "../../parser/parsing-utilities";
import { logError, logInfo } from "../../../middleware/logging";
import expect from "expect";

// Mocking
jest.mock('../../../middleware/logging');
jest.mock('../../parser/parsing-utilities');
jest.mock('../../parser/acknowledgement-parser');
jest.mock('../../database/create-acknowledgement');

describe('acknowledgement-handler.test.js', () => {
    // ============ COMMON PROPERTIES ============
    const CONVERSATION_ID = '63C1E862-8891-43E0-A53D-95EB5FCE1F08';
    const POSITIVE_LOG_MESSAGE = 'POSITIVE ACKNOWLEDGEMENT RECEIVED';
    // =================== END ===================

    it('should handle a positive acknowledgement with typecode AA successfully', async () => {
        // given
        const acknowledgementMessage = {
            acknowledgementTypeCode: 'AA'
        };

        // when
        parseConversationId.mockResolvedValueOnce(Promise.resolve(CONVERSATION_ID));
        parseAcknowledgementMessage.mockResolvedValueOnce(Promise.resolve(acknowledgementMessage));
        createAcknowledgement.mockResolvedValueOnce(undefined);

        await acknowledgementMessageHandler(acknowledgementMessage);

        // then
        expect(logInfo).toHaveBeenCalledTimes(1);
        expect(logInfo).toHaveBeenCalledWith(POSITIVE_LOG_MESSAGE);
    });

    it('should handle a negative acknowledgement with typecode AR successfully', async () => {
        // given
        const acknowledgementMessage = {
            acknowledgementTypeCode: 'AR',
            acknowledgementDetail: 'NOT FOUND'
        };

        // when
        parseConversationId.mockResolvedValueOnce(Promise.resolve(CONVERSATION_ID));
        parseAcknowledgementMessage.mockResolvedValueOnce(Promise.resolve(acknowledgementMessage));
        createAcknowledgement.mockResolvedValueOnce(undefined);

        await acknowledgementMessageHandler(acknowledgementMessage);

        // then
        expect(logInfo).toHaveBeenCalledTimes(1);
        expect(logInfo).toHaveBeenCalledWith(`NEGATIVE ACKNOWLEDGEMENT RECEIVED - DETAIL: ${acknowledgementMessage.acknowledgementDetail}`);
    });

    it('should handle a negative acknowledgement with typecode AE successfully', async () => {
        // given
        const acknowledgementMessage = {
            acknowledgementTypeCode: 'AE',
            acknowledgementDetail: 'Error with something'
        };

        // when
        parseConversationId.mockResolvedValueOnce(Promise.resolve(CONVERSATION_ID));
        parseAcknowledgementMessage.mockResolvedValueOnce(Promise.resolve(acknowledgementMessage));
        createAcknowledgement.mockResolvedValueOnce(undefined);

        await acknowledgementMessageHandler(acknowledgementMessage);

        // then
        expect(logInfo).toHaveBeenCalledTimes(1);
        expect(logInfo).toHaveBeenCalledWith(`NEGATIVE ACKNOWLEDGEMENT RECEIVED - DETAIL: ${acknowledgementMessage.acknowledgementDetail}`);
    });

    it('should handle an unknown acknowledgement typecode successfully', async () => {
        // given
        const acknowledgementMessage = {
            acknowledgementTypeCode: 'XY'
        };

        // when
        parseConversationId.mockResolvedValueOnce(Promise.resolve(CONVERSATION_ID));
        parseAcknowledgementMessage.mockResolvedValueOnce(Promise.resolve(acknowledgementMessage));
        createAcknowledgement.mockResolvedValueOnce(undefined);

        await acknowledgementMessageHandler(acknowledgementMessage);

        // then
        expect(logError).toHaveBeenCalledTimes(1);
        expect(logError).toHaveBeenCalledWith('ACKNOWLEDGEMENT TYPE XY IS UNKNOWN.');
    });
});
