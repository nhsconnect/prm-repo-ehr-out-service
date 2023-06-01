import { parseContinueRequestMessage } from "../continue-request-parser";
import { readFileSync } from "fs";
import expect from "expect";
import path from "path";
import { validateFieldsHaveSuccessfullyParsed } from "../parsing-validation";

// Mocking
jest.mock('../parsing-validation');

describe('continue-request-parser.js', () => {
  it('should parse a continue request successfully', async () => {
    // given
    const odsCode = "M85019";
    const exampleContinueRequest = readFileSync(path.join(__dirname, "data", "continue-requests", "COPC_IN000001UK01"), "utf-8");

    validateFieldsHaveSuccessfullyParsed.mockReturnValueOnce(undefined);

    // when
    const parsedMessage = await parseContinueRequestMessage(exampleContinueRequest);

    // then
    expect(parsedMessage.odsCode).toEqual(odsCode);
  });
});