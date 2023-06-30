import { parseAcknowledgementMessage } from "../../parser/acknowledgement-parser";
import { createAcknowledgement } from "../../database/create-acknowledgement";
import { acknowledgementMessageHandler } from "../acknowledgement-handler";
import { sendDeleteRequestToEhrRepo } from "../../ehr-repo/delete-ehr";
import { parseConversationId } from "../../parser/parsing-utilities";
import { logError, logInfo } from "../../../middleware/logging";
import {
    getNhsNumberByConversationId,
    registrationRequestExistsWithMessageId
} from "../../database/registration-request-repository";
import expect from "expect";

// Mocking
jest.mock('../../../middleware/logging');
jest.mock('../../parser/parsing-utilities');
jest.mock('../../parser/acknowledgement-parser');
jest.mock('../../database/create-acknowledgement');
jest.mock('../../database/registration-request-repository');
jest.mock('../../ehr-repo/delete-ehr');

describe('acknowledgement-handler.test.js', () => {
    // ============ COMMON PROPERTIES ============
    const CONVERSATION_ID = '63C1E862-8891-43E0-A53D-95EB5FCE1F08';
    const MESSAGE_REF = '9BD81F1F-DD62-470A-AAB8-B500FDA7A9EC';
    const NHS_NUMBER = 1245748541;
    const POSITIVE_LOG_MESSAGE = 'Positive acknowledgement received.';
    // =================== END ===================

    it('should handle a positive acknowledgement with typecode AA successfully', async () => {
        // given
        const acknowledgementMessage = {
            acknowledgementTypeCode: 'AA',
            messageRef: MESSAGE_REF
        };

        // when
        parseConversationId.mockResolvedValueOnce(Promise.resolve(CONVERSATION_ID));
        parseAcknowledgementMessage.mockResolvedValueOnce(Promise.resolve(acknowledgementMessage));
        registrationRequestExistsWithMessageId.mockResolvedValueOnce(Promise.resolve(false));
        getNhsNumberByConversationId.mockResolvedValueOnce(Promise.resolve(NHS_NUMBER));
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
            messageRef: MESSAGE_REF,
            acknowledgementDetail: 'floppy disk not found'
        };

        // when
        parseConversationId.mockResolvedValueOnce(Promise.resolve(CONVERSATION_ID));
        parseAcknowledgementMessage.mockResolvedValueOnce(Promise.resolve(acknowledgementMessage));
        registrationRequestExistsWithMessageId.mockResolvedValueOnce(Promise.resolve(false));
        getNhsNumberByConversationId.mockResolvedValueOnce(Promise.resolve(NHS_NUMBER));
        createAcknowledgement.mockResolvedValueOnce(undefined);

        await acknowledgementMessageHandler(acknowledgementMessage);

        // then
        expect(logInfo).toHaveBeenCalledTimes(1);
        expect(logInfo).toHaveBeenCalledWith(`Negative acknowledgement received - detail: ${acknowledgementMessage.acknowledgementDetail}.`);
    });

    it('should handle a negative acknowledgement with typecode AE successfully', async () => {
        // given
        const acknowledgementMessage = {
            acknowledgementTypeCode: 'AE',
            messageRef: MESSAGE_REF,
            acknowledgementDetail: 'floppy disk not found'
        };

        // when
        parseConversationId.mockResolvedValueOnce(Promise.resolve(CONVERSATION_ID));
        parseAcknowledgementMessage.mockResolvedValueOnce(Promise.resolve(acknowledgementMessage));
        registrationRequestExistsWithMessageId.mockResolvedValueOnce(Promise.resolve(false));
        getNhsNumberByConversationId.mockResolvedValueOnce(Promise.resolve(NHS_NUMBER));
        createAcknowledgement.mockResolvedValueOnce(undefined);

        await acknowledgementMessageHandler(acknowledgementMessage);

        // then
        expect(logInfo).toHaveBeenCalledTimes(1);
        expect(logInfo).toHaveBeenCalledWith(`Negative acknowledgement received - detail: ${acknowledgementMessage.acknowledgementDetail}.`);
    });

    it('should handle an unknown acknowledgement typecode successfully', async () => {
        // given
        const acknowledgementMessage = {
            acknowledgementTypeCode: 'ES',
        };

        // when
        parseConversationId.mockResolvedValueOnce(Promise.resolve(CONVERSATION_ID));
        parseAcknowledgementMessage.mockResolvedValueOnce(Promise.resolve(acknowledgementMessage));
        registrationRequestExistsWithMessageId.mockResolvedValueOnce(Promise.resolve(false));
        getNhsNumberByConversationId.mockResolvedValueOnce(Promise.resolve(NHS_NUMBER));
        createAcknowledgement.mockResolvedValueOnce(undefined);

        await acknowledgementMessageHandler(acknowledgementMessage);

        // then
        expect(logError).toHaveBeenCalledTimes(1);
        expect(logError).toHaveBeenCalledWith('Acknowledgement type ES is unknown.');
    });

    it('should handle a positive integration acknowledgement successfully', async () => {
        // given
        const acknowledgementMessage = {
            acknowledgementTypeCode: 'AA',
            messageRef: MESSAGE_REF
        };

        // when
        parseConversationId.mockResolvedValueOnce(Promise.resolve(CONVERSATION_ID));
        parseAcknowledgementMessage.mockResolvedValueOnce(Promise.resolve(acknowledgementMessage));
        registrationRequestExistsWithMessageId.mockResolvedValueOnce(Promise.resolve(true));
        getNhsNumberByConversationId.mockResolvedValueOnce(Promise.resolve(NHS_NUMBER));
        createAcknowledgement.mockResolvedValueOnce(undefined);
        sendDeleteRequestToEhrRepo.mockResolvedValueOnce(Promise.resolve({}));

        await acknowledgementMessageHandler(acknowledgementMessage);

        // then
        expect(logInfo).toBeCalledTimes(2);
        expect(sendDeleteRequestToEhrRepo).toBeCalledTimes(1);
        expect(sendDeleteRequestToEhrRepo.mock.calls[0][0]).toEqual(NHS_NUMBER);
        expect(sendDeleteRequestToEhrRepo.mock.calls[0][1]).toEqual(CONVERSATION_ID);
    });

    it('should handle a negative integration acknowledgement successfully', async () => {
        // given
        const acknowledgementMessage = {
            acknowledgementTypeCode: 'AE',
            messageRef: MESSAGE_REF
        };

        // when
        parseConversationId.mockResolvedValueOnce(Promise.resolve(CONVERSATION_ID));
        parseAcknowledgementMessage.mockResolvedValueOnce(Promise.resolve(acknowledgementMessage));
        registrationRequestExistsWithMessageId.mockResolvedValueOnce(Promise.resolve(true));
        getNhsNumberByConversationId.mockResolvedValueOnce(Promise.resolve(NHS_NUMBER));
        createAcknowledgement.mockResolvedValueOnce(undefined);

        await acknowledgementMessageHandler(acknowledgementMessage);

        // then
        expect(logInfo).toBeCalledTimes(1);
        expect(logInfo).toBeCalledWith('Negative integration acknowledgement received.');
    });
});
