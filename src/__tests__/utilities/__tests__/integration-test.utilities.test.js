import { readFile, validateMessageEquality } from "../integration-test.utilities";
import expect from "expect";

describe('integration-test-utilities.js', () => {
  describe('readMessage', () => {});

  describe('validateMessageEquality', () => {
    it('should be true when a large ehr UK06 has no unexpected changes', () => {
      // given
      const originalMessage = readFile('RCMR_IN030000UK06', 'equality-test', 'large-ehr', 'original');

      // when
      const result = validateMessageEquality(originalMessage, originalMessage);

      // then
      expect(result).toBe(true);
    });

    it('should be true when a small ehr UK06 has no unexpected changes', () => {
      // given
      const originalMessage = readFile('RCMR_IN030000UK06', 'equality-test', 'small-ehr', 'original');

      // when
      const result = validateMessageEquality(originalMessage, originalMessage);

      // then
      expect(result).toBe(true);
    });

    it('should be false when a large ehr UK06 has unexpected changes', () => {
      // given
      const originalMessage = readFile('RCMR_IN030000UK06', 'equality-test', 'large-ehr', 'original');
      const modifiedMessage = readFile('RCMR_IN030000UK06', 'equality-test', 'large-ehr', 'modified');

      // when
      const result = validateMessageEquality(originalMessage, modifiedMessage);

      // then
      expect(result).toBe(false);
    });

    it('should be false when a small ehr UK06 has unexpected changes', () => {
      // given
      const originalMessage = readFile('RCMR_IN030000UK06', 'equality-test', 'small-ehr', 'original');
      const modifiedMessage = readFile('RCMR_IN030000UK06', 'equality-test', 'small-ehr', 'modified');

      // when
      const result = validateMessageEquality(originalMessage, modifiedMessage);

      // then
      expect(result).toBe(false);
    });
  });
});