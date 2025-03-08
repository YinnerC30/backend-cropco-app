import { DateFormatter } from './date-formatter';

describe('DateFormatter', () => {
  describe('getSpanishDate', () => {
    it('should format date string to Spanish date format', () => {
      const originalDate = '2023-10-05';
      const formattedDate = DateFormatter.getSpanishDate(originalDate);
      expect(formattedDate).toBe('5 de octubre de 2023');
    });

    it('should format date string to Spanish date format for a different date', () => {
      const originalDate = '2022-01-15';
      const formattedDate = DateFormatter.getSpanishDate(originalDate);
      expect(formattedDate).toBe('15 de enero de 2022');
    });

    it('should handle invalid date string gracefully', () => {
      const originalDate = 'invalid-date';
      const formattedDate = DateFormatter.getSpanishDate(originalDate);
      expect(formattedDate).toBe('NaN de undefined de NaN');
    });
  });
});
