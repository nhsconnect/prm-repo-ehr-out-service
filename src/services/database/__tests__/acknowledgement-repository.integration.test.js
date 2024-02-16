import { parseAcknowledgementMessage } from "../../parser/acknowledgement-parser";
import { getAcknowledgementByMessageId } from "../acknowledgement-repository";
import { createAcknowledgement } from "../create-acknowledgement";
import { modelName } from '../../../models/acknowledgements';
import { SERVICES } from "../../../constants/services";
import ModelFactory from '../../../models';
import { readFileSync } from "fs";
import expect from "expect";
import path from "path";
import { AcknowledgementRecordNotFoundError } from "../../../errors/errors";

describe('acknowledgementRepository', () => {
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

    it('should retrieve the acknowledgement by message id', async () => {
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

        const acknowledgement = await getAcknowledgementByMessageId(acknowledgementMessageId);

        // then
        expect(acknowledgement).not.toBeNull();
        expect(acknowledgement.get().messageId.toUpperCase()).toBe(acknowledgementMessageId);
        expect(acknowledgement.get().acknowledgementTypeCode).toBe(acknowledgementTypeCode);
        expect(acknowledgement.get().acknowledgementDetail).toBe(acknowledgementDetail);
        expect(acknowledgement.get().service).toBe(SERVICES.gp2gp);
        expect(acknowledgement.get().referencedMessageId).toBe(referencedMessageId);
        expect(acknowledgement.get().messageRef).toBe(messageRef);
    });

    it('should throw AcknowledgementRecordNotFoundError when it cannot find the acknowledgement', async () => {
        // given
        const nonExistentAcknowledgementMessageId = '4be94216-b00d-4355-8929-b22c8512b074';

        // when
        await expect(async () => {
            await getAcknowledgementByMessageId(nonExistentAcknowledgementMessageId)
        })  // then
            .rejects.toThrow(AcknowledgementRecordNotFoundError);
    });
});
