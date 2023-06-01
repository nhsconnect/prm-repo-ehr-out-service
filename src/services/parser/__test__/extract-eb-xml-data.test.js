import { extractReferencedFragmentMessageIds } from '../extract-eb-xml-data';
import { readFileSync } from 'fs';
import { ParseMessageError } from '../../../errors/errors';

describe('test extract-eb-xml-data', () => {
  // ============ COMMON PROPERTIES ============
  function getValidEhrCore() {
    return readFileSync('src/__tests__/data/ehr_with_fragments/ehr-core', 'utf8');
  }

  function getEhrCoreWithOnlyOneReference() {
    return readFileSync('src/__tests__/data/ehr_with_fragments/ehr-core-with-only-one-ref', 'utf8');
  }

  function getEhrCoreWithNoFragment() {
    return readFileSync('src/__tests__/data/RCMR_IN030000UK06', 'utf8');
  }

  // =================== END ===================

  describe('extractReferencedFragmentMessageIds', () => {
    it('should return all message ids of the fragments referenced in a ehrCore', async () => {
      // given
      const ehrCore = getValidEhrCore();
      const ebXml = JSON.parse(ehrCore).ebXML;

      const expectedMessageIds = [
        'DFBA6AC0-DDC7-11ED-808B-AC162D1F16F0',
        'DFEC7740-DDC7-11ED-808B-AC162D1F16F0'
      ];

      // when
      const messageIds = await extractReferencedFragmentMessageIds(ebXml);

      // then
      expect(messageIds).toEqual(expectedMessageIds);
    });

    it('should be able to handle ehrCore with only one fragment in reference block', async () => {
      // given
      const ehrCore = getEhrCoreWithOnlyOneReference();
      const ebXml = JSON.parse(ehrCore).ebXML;

      const expectedMessageIds = ['D6BB8150-D478-11ED-808B-AC162D1F16F0'];

      // when
      const messageIds = await extractReferencedFragmentMessageIds(ebXml);

      // then
      expect(messageIds).toEqual(expectedMessageIds);
    });

    it('should return an empty array if the ehrCore doesnt have any fragment', async () => {
      // given
      const ehrCore = getEhrCoreWithNoFragment();
      const ebXml = JSON.parse(ehrCore).ebXML;

      // when
      const messageIds = await extractReferencedFragmentMessageIds(ebXml);

      // then
      expect(messageIds).toEqual([]);
    });

    it('should throw an error if failed to parse the ebXML', async () => {
      // given
      const ehrCore = `{"ebXML": "<xml>some-invalid-xml</xml>"}`;
      const ebXml = JSON.parse(ehrCore).ebXML;

      // when
      await expect(extractReferencedFragmentMessageIds(ebXml))
        // then
        .rejects.toThrow(ParseMessageError);
    });
  });
});
