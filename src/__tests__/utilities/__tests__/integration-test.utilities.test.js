import { readFile, validateMessageEquality } from "../integration-test.utilities";
import expect from "expect";
import { FileReadError } from "../../../errors/errors";

describe('integration-test-utilities.js', () => {
  describe('readMessage', () => {
    it('should read a file successfully if the file name and folder path is correct', () => {
      // given
      const fileName = 'RCMR_IN030000UK06';
      const folders = [
        'equality-test',
        'large-ehr',
        'original'
      ];

      // when
      const result = readFile(fileName, ...folders);

      // then
      expect(result).not.toBe(undefined);
    });

    it('should throw a FileReadError when the file name is incorrect' , () => {
      // given
      const fileName = 'RCMR_IN030000UK10';
      const folders = [
        'equality-test',
        'large-ehr',
        'original'
      ];

      // then
      expect(() => readFile(fileName, ...folders))
        .toThrow(FileReadError);
    });

    it('should throw a FileReadError when a folder name is incorrect', () => {
      // given
      const fileName = 'RCMR_IN030000UK06';
      const folders = [
        'equality-test',
        'large-ehr',
        'original',
        'unknown'
      ];

      // then
      expect(() => readFile(fileName, ...folders))
        .toThrow(FileReadError);
    });
  });

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