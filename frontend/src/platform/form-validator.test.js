import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FormValidator, loginValidator, registerValidator } from './form-validator.js';

describe('form-validator — Form Validation & DOM Manipulation', () => {
  let validator;

  beforeEach(() => {
    validator = new FormValidator();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============= Email Validation =============

  describe('Email Validation', () => {
    it('1. validates correct email format', () => {
      validator.addRule('email', 'required|email');
      const errors = validator.validate({ email: 'user@example.com' });
      expect(errors).toBeNull();
    });

    it('2. validates email with multiple subdomains', () => {
      validator.addRule('email', 'email');
      const errors = validator.validate({ email: 'user@mail.company.co.uk' });
      expect(errors).toBeNull();
    });

    it('3. rejects email without @ symbol', () => {
      validator.addRule('email', 'email');
      const errors = validator.validate({ email: 'invalidemail.com' });
      expect(errors.email).toBeTruthy();
    });

    it('4. rejects email without domain', () => {
      validator.addRule('email', 'email');
      const errors = validator.validate({ email: 'user@' });
      expect(errors.email).toBeTruthy();
    });

    it('5. rejects email with spaces', () => {
      validator.addRule('email', 'email');
      const errors = validator.validate({ email: 'user @example.com' });
      expect(errors.email).toBeTruthy();
    });

    it('6. allows empty email when only email rule (no required)', () => {
      validator.addRule('email', 'email');
      const errors = validator.validate({ email: '' });
      expect(errors).toBeNull();
    });

    it('7. rejects empty email when required|email', () => {
      validator.addRule('email', 'required|email');
      const errors = validator.validate({ email: '' });
      expect(errors.email).toBeTruthy();
    });

    it('8. rejects null email when required', () => {
      validator.addRule('email', 'required|email');
      const errors = validator.validate({ email: null });
      expect(errors.email).toBeTruthy();
    });

    it('9. rejects undefined email when required', () => {
      validator.addRule('email', 'required|email');
      const errors = validator.validate({ email: undefined });
      expect(errors.email).toBeTruthy();
    });

    it('10. returns error message in Portuguese', () => {
      validator.addRule('email', 'email');
      const errors = validator.validate({ email: 'invalid' });
      expect(errors.email).toBe('Email inválido.');
    });
  });

  // ============= Password Validation =============

  describe('Password Validation', () => {
    it('11. validates strong password with all requirements', () => {
      validator.addRule('password', 'strongPassword');
      const errors = validator.validate({ password: 'ValidPass123!' });
      expect(errors).toBeNull();
    });

    it('12. accepts password with uppercase, lowercase, number and special char', () => {
      validator.addRule('password', 'strongPassword');
      const errors = validator.validate({ password: 'MyPassword1@' });
      expect(errors).toBeNull();
    });

    it('13. rejects password without uppercase letters', () => {
      validator.addRule('password', 'strongPassword');
      const errors = validator.validate({ password: 'mypassword123!' });
      expect(errors.password).toBeTruthy();
    });

    it('14. rejects password without lowercase letters', () => {
      validator.addRule('password', 'strongPassword');
      const errors = validator.validate({ password: 'MYPASSWORD123!' });
      expect(errors.password).toBeTruthy();
    });

    it('15. rejects password without numbers', () => {
      validator.addRule('password', 'strongPassword');
      const errors = validator.validate({ password: 'MyPassword!' });
      expect(errors.password).toBeTruthy();
    });

    it('16. rejects password without special characters', () => {
      validator.addRule('password', 'strongPassword');
      const errors = validator.validate({ password: 'MyPassword123' });
      expect(errors.password).toBeTruthy();
    });

    it('17. rejects password shorter than 8 characters', () => {
      validator.addRule('password', 'strongPassword');
      const errors = validator.validate({ password: 'Pass1@' });
      expect(errors.password).toBeTruthy();
    });

    it('18. accepts password exactly 8 characters with all requirements', () => {
      validator.addRule('password', 'strongPassword');
      const errors = validator.validate({ password: 'Pass123!' });
      expect(errors).toBeNull();
    });

    it('19. accepts password longer than 8 characters', () => {
      validator.addRule('password', 'strongPassword');
      const errors = validator.validate({ password: 'MyVeryStrongPassword123!' });
      expect(errors).toBeNull();
    });

    it('20. allows various special characters', () => {
      validator.addRule('password', 'strongPassword');
      const validPasswords = [
        'Pass123!',
        'Pass123@',
        'Pass123#',
        'Pass123$',
        'Pass123%',
        'Pass123^',
        'Pass123&',
        'Pass123*',
      ];
      validPasswords.forEach(pwd => {
        const errors = validator.validate({ password: pwd });
        expect(errors).toBeNull();
      });
    });
  });

  // ============= Min/Max Length Rules =============

  describe('Min/Max Length Validation', () => {
    it('21. validates min length rule', () => {
      validator.addRule('name', 'min:3');
      const errors = validator.validate({ name: 'John' });
      expect(errors).toBeNull();
    });

    it('22. rejects value shorter than min length', () => {
      validator.addRule('name', 'min:5');
      const errors = validator.validate({ name: 'Jo' });
      expect(errors.name).toBeTruthy();
    });

    it('23. accepts value exactly at min length', () => {
      validator.addRule('name', 'min:5');
      const errors = validator.validate({ name: 'John!' });
      expect(errors).toBeNull();
    });

    it('24. validates max length rule', () => {
      validator.addRule('bio', 'max:100');
      const errors = validator.validate({ bio: 'Short bio' });
      expect(errors).toBeNull();
    });

    it('25. rejects value longer than max length', () => {
      validator.addRule('bio', 'max:10');
      const errors = validator.validate({ bio: 'This is a very long bio that exceeds the limit' });
      expect(errors.bio).toBeTruthy();
    });

    it('26. accepts value exactly at max length', () => {
      validator.addRule('bio', 'max:10');
      const errors = validator.validate({ bio: 'Exactly10!' });
      expect(errors).toBeNull();
    });

    it('27. combines min and max rules', () => {
      validator.addRule('username', 'min:3|max:20');
      expect(validator.validate({ username: 'jo' }).username).toBeTruthy(); // Too short
      expect(validator.validate({ username: 'validUsername' })).toBeNull(); // Valid
      expect(validator.validate({ username: 'a'.repeat(21) }).username).toBeTruthy(); // Too long
    });

    it('28. shows min length error in Portuguese with field name', () => {
      validator.addRule('password', 'min:8');
      const errors = validator.validate({ password: 'short' });
      expect(errors.password).toContain('mínimo');
      expect(errors.password).toContain('8');
    });

    it('29. shows max length error in Portuguese with field name', () => {
      validator.addRule('description', 'max:50');
      const errors = validator.validate({ description: 'x'.repeat(51) });
      expect(errors.description).toContain('máximo');
      expect(errors.description).toContain('50');
    });
  });

  // ============= Match Rule (Password Confirmation) =============

  describe('Match Rule — Password Confirmation', () => {
    it('30. validates matching passwords', () => {
      validator.addRule('password', 'required|strongPassword');
      validator.addRule('confirmPassword', 'match:password');

      const password = 'ValidPass123!';
      const errors = validator.validate({
        password,
        confirmPassword: password,
      });
      expect(errors).toBeNull();
    });

    it('31. rejects non-matching passwords', () => {
      validator.addRule('password', 'required');
      validator.addRule('confirmPassword', 'match:password');

      const errors = validator.validate({
        password: 'MyPassword123!',
        confirmPassword: 'DifferentPass123!',
      });
      expect(errors.confirmPassword).toBeTruthy();
    });

    it('32. rejects empty confirm password', () => {
      validator.addRule('password', 'required');
      validator.addRule('confirmPassword', 'match:password');

      const errors = validator.validate({
        password: 'MyPassword123!',
        confirmPassword: '',
      });
      // match rule should fail because '' !== 'MyPassword123!'
      expect(errors.confirmPassword).toBeTruthy();
    });
  });

  // ============= Phone Validation =============

  describe('Phone Validation', () => {
    it('33. validates standard US phone format', () => {
      validator.addRule('phone', 'phone');
      const errors = validator.validate({ phone: '(123) 456-7890' });
      expect(errors).toBeNull();
    });

    it('34. validates phone without parentheses', () => {
      validator.addRule('phone', 'phone');
      const errors = validator.validate({ phone: '123-456-7890' });
      expect(errors).toBeNull();
    });

    it('35. validates international phone with + prefix', () => {
      validator.addRule('phone', 'phone');
      const errors = validator.validate({ phone: '+55 11 98765-4321' });
      expect(errors).toBeNull();
    });

    it('36. rejects invalid phone format', () => {
      validator.addRule('phone', 'phone');
      const errors = validator.validate({ phone: '123' });
      expect(errors.phone).toBeTruthy();
    });

    it('37. allows empty phone when not required', () => {
      validator.addRule('phone', 'phone');
      const errors = validator.validate({ phone: '' });
      expect(errors).toBeNull();
    });

    it('38. requires phone when required rule applied', () => {
      validator.addRule('phone', 'required|phone');
      const errors = validator.validate({ phone: '' });
      expect(errors.phone).toBeTruthy();
    });

    it('39. returns error message in Portuguese', () => {
      validator.addRule('phone', 'phone');
      const errors = validator.validate({ phone: '123' });
      expect(errors.phone).toContain('Telefone');
    });
  });

  // ============= Custom Messages =============

  describe('Custom Error Messages', () => {
    it('40. allows custom error message for a field', () => {
      validator.addRule('email', 'required|email');
      validator.messages.set('email', 'Email deve ser válido e estar preenchido.');
      const errors = validator.validate({ email: 'invalid' });
      expect(errors.email).toBe('Email deve ser válido e estar preenchido.');
    });

    it('41. custom messages can use field name placeholder', () => {
      validator.messages.set('required', 'O campo {field} é obrigatório.');
      validator.addRule('username', 'required');
      const errors = validator.validate({ username: '' });
      expect(errors.username).toContain('username');
    });

    it('42. custom messages can use parameter placeholders', () => {
      validator.messages.set('min', 'Mínimo {param} caracteres necessários para {field}.');
      validator.addRule('password', 'min:8');
      const errors = validator.validate({ password: 'short' });
      expect(errors.password).toContain('8');
    });

    it('43. default messages are in Portuguese', () => {
      validator.addRule('email', 'required');
      const errors = validator.validate({ email: '' });
      expect(errors.email).toBe('Email é obrigatório.');
    });
  });

  // ============= markErrors() DOM Manipulation =============

  describe('markErrors() — DOM Manipulation', () => {
    let form;

    beforeEach(() => {
      // Create a mock form with fields
      form = document.createElement('form');
      form.innerHTML = `
        <input type="email" name="email" placeholder="Email" />
        <input type="password" name="password" placeholder="Password" />
        <button type="submit">Submit</button>
      `;
      document.body.appendChild(form);
    });

    afterEach(() => {
      document.body.removeChild(form);
    });

    it('44. marks input field with data-error attribute', () => {
      const errors = { email: 'Email inválido.' };
      validator.markErrors(form, errors);

      const emailInput = form.querySelector('input[name="email"]');
      expect(emailInput.getAttribute('data-error')).toBe('true');
    });

    it('45. creates error message div below input', () => {
      const errors = { email: 'Email inválido.' };
      validator.markErrors(form, errors);

      const errorDiv = form.querySelector('.form-field-error');
      expect(errorDiv).toBeTruthy();
      expect(errorDiv.textContent).toBe('Email inválido.');
    });

    it('46. styles error div with red color and small font', () => {
      const errors = { email: 'Email inválido.' };
      validator.markErrors(form, errors);

      const errorDiv = form.querySelector('.form-field-error');
      expect(errorDiv.style.color).toBe('rgb(239, 68, 68)'); // #ef4444
      expect(errorDiv.style.fontSize).toBe('0.75rem');
    });

    it('47. marks multiple fields with errors', () => {
      const errors = {
        email: 'Email inválido.',
        password: 'Senha fraca.',
      };
      validator.markErrors(form, errors);

      const errorDivs = form.querySelectorAll('.form-field-error');
      expect(errorDivs.length).toBe(2);
    });

    it('48. clears previous errors before adding new ones', () => {
      // First pass with email error
      validator.markErrors(form, { email: 'Email inválido.' });
      expect(form.querySelectorAll('.form-field-error').length).toBe(1);

      // Second pass with only password error
      validator.markErrors(form, { password: 'Senha fraca.' });
      expect(form.querySelectorAll('.form-field-error').length).toBe(1);
      expect(form.querySelector('.form-field-error').textContent).toBe('Senha fraca.');
    });

    it('49. ignores fields not in form', () => {
      const errors = { nonExistentField: 'Error' };
      expect(() => {
        validator.markErrors(form, errors);
      }).not.toThrow();
    });

    it('50. removes data-error attribute from previously errored fields', () => {
      // First mark email with error
      validator.markErrors(form, { email: 'Email inválido.' });
      const emailInput = form.querySelector('input[name="email"]');
      expect(emailInput.getAttribute('data-error')).toBe('true');

      // Clear errors
      validator.clearErrors(form);
      expect(emailInput.getAttribute('data-error')).toBeNull();
    });
  });

  // ============= clearErrors() Cleanup =============

  describe('clearErrors() — Cleanup', () => {
    let form;

    beforeEach(() => {
      form = document.createElement('form');
      form.innerHTML = `
        <input type="email" name="email" />
        <input type="password" name="password" />
      `;
      document.body.appendChild(form);
    });

    afterEach(() => {
      document.body.removeChild(form);
    });

    it('51. removes all error divs', () => {
      const errors = {
        email: 'Email inválido.',
        password: 'Senha fraca.',
      };
      validator.markErrors(form, errors);
      expect(form.querySelectorAll('.form-field-error').length).toBe(2);

      validator.clearErrors(form);
      expect(form.querySelectorAll('.form-field-error').length).toBe(0);
    });

    it('52. removes data-error attributes', () => {
      validator.markErrors(form, { email: 'Error' });
      expect(form.querySelector('input[name="email"]').getAttribute('data-error')).toBe('true');

      validator.clearErrors(form);
      expect(form.querySelector('input[name="email"]').getAttribute('data-error')).toBeNull();
    });

    it('53. can be called multiple times safely', () => {
      validator.markErrors(form, { email: 'Error' });
      validator.clearErrors(form);
      expect(() => {
        validator.clearErrors(form);
      }).not.toThrow();
    });

    it('54. preserves form structure and other attributes', () => {
      const inputEmail = form.querySelector('input[name="email"]');
      inputEmail.className = 'form-control';
      inputEmail.id = 'email-field';

      validator.markErrors(form, { email: 'Error' });
      validator.clearErrors(form);

      expect(inputEmail.className).toBe('form-control');
      expect(inputEmail.id).toBe('email-field');
    });
  });

  // ============= Multiple Validation Rules =============

  describe('Multiple Rules Per Field', () => {
    it('55. validates multiple rules on one field', () => {
      validator.addRule('username', 'required|min:3|max:20');
      expect(validator.validate({ username: '' }).username).toBeTruthy(); // required fails
      expect(validator.validate({ username: 'ab' }).username).toBeTruthy(); // min fails
      expect(validator.validate({ username: 'a'.repeat(21) }).username).toBeTruthy(); // max fails
      expect(validator.validate({ username: 'validUser' })).toBeNull();
    });

    it('56. stops at first failing rule for a field', () => {
      validator.addRule('email', 'required|email');
      const errors = validator.validate({ email: '' });
      // Should fail on required, not email
      expect(errors.email).toContain('obrigatório');
    });

    it('57. validates all fields simultaneously', () => {
      validator.addRule('email', 'required|email');
      validator.addRule('password', 'required|min:8');
      validator.addRule('name', 'required|min:2');

      const errors = validator.validate({
        email: 'invalid',
        password: 'short',
        name: 'A',
      });

      expect(Object.keys(errors).length).toBe(3);
      expect(errors.email).toBeTruthy();
      expect(errors.password).toBeTruthy();
      expect(errors.name).toBeTruthy();
    });
  });

  // ============= Pre-configured Validators =============

  describe('Pre-configured Validators', () => {
    it('58. loginValidator requires email and min 8 chars password', () => {
      const errors = loginValidator.validate({
        email: 'user@example.com',
        password: 'Password123',
      });
      expect(errors).toBeNull();
    });

    it('59. loginValidator rejects invalid email', () => {
      const errors = loginValidator.validate({
        email: 'invalidemail',
        password: 'Password123',
      });
      expect(errors.email).toBeTruthy();
    });

    it('60. loginValidator rejects short password', () => {
      const errors = loginValidator.validate({
        email: 'user@example.com',
        password: 'short',
      });
      expect(errors.password).toBeTruthy();
    });

    it('61. registerValidator requires strongPassword', () => {
      const errors = registerValidator.validate({
        email: 'user@example.com',
        password: 'WeakPassword',
        confirmPassword: 'WeakPassword',
        displayName: 'John',
      });
      expect(errors.password).toBeTruthy();
    });

    it('62. registerValidator validates password confirmation', () => {
      const errors = registerValidator.validate({
        email: 'user@example.com',
        password: 'StrongPass123!',
        confirmPassword: 'DifferentPass123!',
        displayName: 'John',
      });
      expect(errors.confirmPassword).toBeTruthy();
    });

    it('63. registerValidator validates display name length', () => {
      const errors = registerValidator.validate({
        email: 'user@example.com',
        password: 'StrongPass123!',
        confirmPassword: 'StrongPass123!',
        displayName: 'A',
      });
      expect(errors.displayName).toBeTruthy();
    });
  });

  // ============= Edge Cases =============

  describe('Edge Cases', () => {
    it('64. handles field names with underscores and camelCase', () => {
      validator.addRule('first_name', 'required');
      validator.addRule('lastName', 'required');

      const errors = validator.validate({
        first_name: '',
        lastName: '',
      });

      expect(errors.first_name).toBeTruthy();
      expect(errors.lastName).toBeTruthy();
    });

    it('65. handles numeric values in validation', () => {
      validator.addRule('age', 'numeric');
      expect(validator.validate({ age: '25' })).toBeNull();
      expect(validator.validate({ age: 'abc' }).age).toBeTruthy();
    });

    it('66. humanizes field names for error messages', () => {
      validator.addRule('passwordConfirm', 'required');
      const errors = validator.validate({ passwordConfirm: '' });
      expect(errors.passwordConfirm).toContain('Password confirm');
    });

    it('67. handles whitespace-only input as empty', () => {
      validator.addRule('name', 'required');
      const errors = validator.validate({ name: '   ' });
      expect(errors.name).toBeTruthy();
    });

    it('68. validates empty form data gracefully', () => {
      validator.addRule('email', 'email');
      const errors = validator.validate({});
      expect(errors).toBeNull(); // No required rule, so no error
    });

    it('69. handles special characters in email', () => {
      validator.addRule('email', 'email');
      const errors = validator.validate({ email: 'user+tag@example.com' });
      expect(errors).toBeNull();
    });

    it('70. URL validation works correctly', () => {
      validator.addRule('website', 'url');
      expect(validator.validate({ website: 'https://example.com' })).toBeNull();
      expect(validator.validate({ website: 'not-a-url' }).website).toBeTruthy();
    });

    it('71. handles very long strings', () => {
      validator.addRule('text', 'max:100');
      const longString = 'a'.repeat(101);
      const errors = validator.validate({ text: longString });
      expect(errors.text).toBeTruthy();
    });

    it('72. date validation rule exists', () => {
      validator.addRule('birthDate', 'date');
      // This should at least not throw, even if date validation is basic
      expect(() => {
        validator.validate({ birthDate: '2000-01-01' });
      }).not.toThrow();
    });
  });
});
