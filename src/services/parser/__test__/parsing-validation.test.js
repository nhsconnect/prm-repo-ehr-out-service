import {validateFieldsHaveSuccessfullyParsed} from "../parsing-validation";
import { ParsingError } from "../../../errors/errors";
import expect from "expect";

describe('parsing-validation.js', () => {
    it('should throw a ParsingError if one or more fields are undefined', () => {
        // Given
        const parsedFields = {
            nhsNumber: undefined,
            odsCode: undefined
        };

        // Then
        expect(() => validateFieldsHaveSuccessfullyParsed(parsedFields))
            .toThrow(ParsingError);
    });
});