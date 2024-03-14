import { parseAcknowledgementMessage } from "../../parser/acknowledgement-parser";
import { createAcknowledgement } from '../create-acknowledgement';
import { logError, logInfo } from '../../../middleware/logging';
import { modelName } from '../../../models/acknowledgements';
import { SERVICES } from "../../../constants/services";
import { runWithinTransaction } from '../helper';
import ModelFactory from '../../../models';
import { readFileSync } from "fs";
import expect from "expect";
import path from "path";

// Mocking
jest.mock("../../../middleware/logging");

/**
 * @deprecated
 * to be deleted in PRMT-4588
 */
describe.skip('createAcknowledgement', () => {
    // ============ COMMON PROPERTIES ============
    const Acknowledgement = ModelFactory.getByName(modelName);
    // =================== END ===================

    beforeEach(async () => {
        await Acknowledgement.truncate();
        await Acknowledgement.sync({ force: true });
    });

    afterAll(async () => {
        await Acknowledgement.sequelize.sync({ force: true });
        await ModelFactory.sequelize.close();
    });

    it('should create an acknowledgement with the correct values', async () => {
        // given
        const parsedAcknowledgement = await parseAcknowledgementMessage(
            JSON.parse(
                readFileSync(path.join(__dirname, "..", "..", "parser", "__test__", "data", "acknowledgements", "negative", "MCCI_IN010000UK13_TPP_AR_01"), "utf-8")
            )
        );
        const messageRef = "1800becd-710c-4e6e-871b-1f1844c32d00";
        const acknowledgementMessageId = "BB8FC948-FA40-41ED-A594-F40343488B16";
        const referencedMessageId = "608368A0-DEC0-496B-9C4F-47CA90B81B58";
        const acknowledgementDetail = "hl7:{interactionId}/hl7:communicationFunctionRcv/hl7:device/hl7:id/@extension is missing, empty, invalid or ACL violation";
        const acknowledgementTypeCode = "AR";

        // when
        await createAcknowledgement(parsedAcknowledgement);

        const acknowledgement = await runWithinTransaction(transaction =>
            Acknowledgement.findOne({
                where: {
                    message_id: acknowledgementMessageId
                },
                transaction: transaction
            })
        );

        // then
        expect(acknowledgement).not.toBeNull();
        expect(acknowledgement.get().messageId.toUpperCase()).toBe(acknowledgementMessageId);
        expect(acknowledgement.get().acknowledgementTypeCode).toBe(acknowledgementTypeCode);
        expect(acknowledgement.get().acknowledgementDetail).toBe(acknowledgementDetail);
        expect(acknowledgement.get().service).toBe(SERVICES.gp2gp);
        expect(acknowledgement.get().referencedMessageId).toBe(referencedMessageId);
        expect(acknowledgement.get().messageRef).toBe(messageRef);
    });

    it('should log event if data persisted correctly', async () => {
        // given
        const parsedAcknowledgement = await parseAcknowledgementMessage(
            JSON.parse(
                readFileSync(path.join(__dirname, "..", "..", "parser", "__test__", "data", "acknowledgements", "negative", "MCCI_IN010000UK13_TPP_AR_01"), "utf-8")
            )
        );

        // when
        await createAcknowledgement(parsedAcknowledgement);

        // then
        expect(logInfo).toHaveBeenCalledTimes(1);
        expect(logInfo).toHaveBeenCalledWith('Acknowledgement has been stored');
    });

    it('should log errors when invalid parsed acknowledgement is passed', async () => {
        try {
            await createAcknowledgement({ messageId: 'hello-world' });
        } catch (error) {
            expect(logError).toHaveBeenCalled();
            expect(logError).toHaveBeenCalledWith(error);
        }
    });
});
