import { IsColombianPhoneConstraint } from './is-colombian-phone.decorator';

describe('IsColombianPhoneConstraint (Unit Tests)', () => {
  let constraint: IsColombianPhoneConstraint;

  beforeEach(() => {
    constraint = new IsColombianPhoneConstraint();
  });

  describe('validate', () => {
    it('should return true for valid Colombian phone numbers', () => {
      const validPhones = ['3001234567', '3109876543', '3205555555'];
      validPhones.forEach((phone) => {
        const mockArgs = {} as any; // Simulamos ValidationArguments
        expect(constraint.validate(phone, mockArgs)).toBe(true);
      });
    });

    it('should return false for invalid Colombian phone numbers', () => {
      const invalidPhones = [
        '1234567890',
        '300123456',
        '30012345678',
        'abc1234567',
      ];
      invalidPhones.forEach((phone) => {
        const mockArgs = {} as any; // Simulamos ValidationArguments
        expect(constraint.validate(phone, mockArgs)).toBe(false);
      });
    });
  });

  describe('defaultMessage', () => {
    it('should return the correct error message', () => {
      const args = { value: '1234567890' } as any; // Simulamos ValidationArguments
      const message = constraint.defaultMessage(args);
      expect(message).toBe(
        'The phone number (1234567890) is not a valid Colombian cell phone number. Make sure it has 10 digits',
      );
    });
  });
});
