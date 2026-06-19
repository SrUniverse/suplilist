/**
 * form-validator.js — Validação robusta de formulários
 *
 * Responsabilidades:
 * 1. Validar campos antes de submeter
 * 2. Fornecer mensagens de erro em português
 * 3. Integrar com UI para mostrar erros inline
 *
 * @module platform/form-validator
 *
 * @example
 * const validator = new FormValidator();
 * validator.addRule('email', 'required|email');
 * validator.addRule('password', 'required|min:8');
 *
 * const errors = validator.validate(formData);
 * if (errors) {
 *   // Mostrar erros ao usuário
 *   return;
 * }
 * // Submeter formulário
 */

/**
 * @typedef {object} ValidationRule
 * @prop {string} name - Nome do campo
 * @prop {string} rule - Regra (ex: 'required|email|min:8')
 * @prop {string} [message] - Mensagem customizada
 */

export class FormValidator {
  constructor() {
    /** @type {Map<string, string>} */
    this.rules = new Map();

    /** @type {Map<string, string>} */
    this.messages = new Map();

    this.registerDefaultMessages();
  }

  /**
   * Registrar mensagens de erro padrão em português
   * @private
   */
  registerDefaultMessages() {
    const messages = {
      required: '{Field} é obrigatório.',
      email: 'Email inválido.',
      min: '{Field} deve ter no mínimo {param} caracteres.',
      max: '{Field} deve ter no máximo {param} caracteres.',
      match: '{field} deve corresponder a {param}.',
      pattern: '{Field} tem um formato inválido.',
      numeric: '{Field} deve ser um número.',
      url: '{Field} deve ser uma URL válida.',
      phone: 'Telefone inválido.',
      date: '{Field} deve ser uma data válida.',
      strongPassword: '{Field} deve ter letras maiúsculas, minúsculas, números e símbolos.',
      unique: '{Field} já está em uso.',
    };

    Object.entries(messages).forEach(([key, msg]) => {
      this.messages.set(key, msg);
    });
  }

  /**
   * Adicionar regra de validação para um campo
   * @param {string} fieldName
   * @param {string} rule - Ex: 'required|email' ou 'required|min:8'
   */
  addRule(fieldName, rule) {
    this.rules.set(fieldName, rule);
  }

  /**
   * Validar um objeto de dados
   * @param {object} data - Dados a validar (ex: { email: 'user@example.com', ... })
   * @returns {object | null} Objeto de erros ou null se válido
   *
   * @example
   * const errors = validator.validate({ email: 'invalid', password: '' });
   * // { email: 'Email inválido.', password: 'Senha é obrigatória.' }
   */
  validate(data) {
    const errors = {};

    for (const [fieldName, rule] of this.rules.entries()) {
      const value = data[fieldName];
      const fieldErrors = this.validateField(fieldName, value, rule, data);

      if (fieldErrors) {
        errors[fieldName] = fieldErrors;
      }
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  /**
   * Validar um campo individual
   * @private
   * @param {string} fieldName
   * @param {any} value
   * @param {string} ruleString - Ex: 'required|email|min:8'
   * @param {object} [data] - Full data object for cross-field rules like match
   * @returns {string | null}
   */
  validateField(fieldName, value, ruleString, data = {}) {
    const rules = ruleString.split('|');

    for (const rule of rules) {
      const [ruleType, ...ruleParams] = rule.split(':');
      const error = this.validateRule(fieldName, value, ruleType, ruleParams, data);

      if (error) {
        return error;
      }
    }

    return null;
  }

  /**
   * Executar uma regra de validação
   * @private
   * @param {string} fieldName
   * @param {any} value
   * @param {string} ruleType
   * @param {string[]} params
   * @param {object} [data] - Full data for cross-field validation
   * @returns {string | null}
   */
  validateRule(fieldName, value, ruleType, params, data = {}) {
    const fieldLabel = this.humanizeFieldName(fieldName);
    const applyFieldPlaceholders = (msg) =>
      msg.replace('{Field}', fieldLabel).replace('{field}', fieldName);

    switch (ruleType) {
      case 'required':
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return applyFieldPlaceholders(this.messages.get('required') || 'Campo obrigatório');
        }
        break;

      case 'email':
        if (value && !this.isValidEmail(value)) {
          return this.messages.get('email') || 'Email inválido';
        }
        break;

      case 'min':
        if (value && value.length < parseInt(params[0], 10)) {
          return applyFieldPlaceholders(
            (this.messages.get('min') || `Mínimo ${params[0]} caracteres`).replace('{param}', params[0])
          );
        }
        break;

      case 'max':
        if (value && value.length > parseInt(params[0], 10)) {
          return applyFieldPlaceholders(
            (this.messages.get('max') || `Máximo ${params[0]} caracteres`).replace('{param}', params[0])
          );
        }
        break;

      case 'match': {
        const otherFieldValue = data[params[0]];
        if (value !== otherFieldValue) {
          return this.messages.get('match') || 'Os valores não conferem';
        }
        break;
      }

      case 'numeric':
        if (value && isNaN(value)) {
          return this.messages.get('numeric') || 'Deve ser um número';
        }
        break;

      case 'url':
        if (value && !this.isValidUrl(value)) {
          return this.messages.get('url') || 'URL inválida';
        }
        break;

      case 'phone':
        if (value && !this.isValidPhone(value)) {
          return this.messages.get('phone')?.replace('{field}', fieldLabel) || 'Telefone inválido';
        }
        break;

      case 'strongPassword':
        if (value && !this.isStrongPassword(value)) {
          return this.messages.get('strongPassword') || 'Senha fraca';
        }
        break;
    }

    return null;
  }

  /**
   * Validadores auxiliares
   * @private
   */

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  isValidPhone(phone) {
    // Accepts formats: (123) 456-7890, 123-456-7890, +1 123 456 7890, etc.
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,14}[0-9]$/;
    return phoneRegex.test(phone);
  }

  isStrongPassword(password) {
    // Mínimo 8 caracteres, com letra maiúscula, minúscula, número e símbolo
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*]/.test(password)
    );
  }

  /**
   * Converter nomesCampo em "Nome Campo" legível
   * @private
   */
  humanizeFieldName(fieldName) {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/^./, str => str.toUpperCase());
  }

  /**
   * Marcar campos com erro na UI
   * @param {HTMLElement} form
   * @param {object} errors
   */
  markErrors(form, errors) {
    // Limpar erros anteriores
    form.querySelectorAll('.form-field-error').forEach(el => {
      el.remove();
    });

    form.querySelectorAll('[data-error="true"]').forEach(el => {
      el.removeAttribute('data-error');
    });

    // Marcar novos erros
    for (const [fieldName, errorMessage] of Object.entries(errors)) {
      const input = form.querySelector(`[name="${fieldName}"]`);
      if (!input) continue;

      input.setAttribute('data-error', 'true');

      const errorEl = document.createElement('div');
      errorEl.className = 'form-field-error';
      errorEl.textContent = errorMessage;
      errorEl.style.color = '#ef4444';
      errorEl.style.fontSize = '0.75rem';
      errorEl.style.marginTop = '0.25rem';

      input.parentNode.appendChild(errorEl);
    }
  }

  /**
   * Limpar erros de um formulário
   * @param {HTMLElement} form
   */
  clearErrors(form) {
    form.querySelectorAll('.form-field-error').forEach(el => {
      el.remove();
    });

    form.querySelectorAll('[data-error="true"]').forEach(el => {
      el.removeAttribute('data-error');
    });
  }
}

export const formValidator = new FormValidator();

/**
 * Validador pré-configurado para login
 */
export const loginValidator = new FormValidator();
loginValidator.addRule('email', 'required|email');
// Login só valida presença — NÃO aplica regra de força. Senhas legadas ou de 6-7
// caracteres precisam conseguir entrar; quem rejeita credencial errada é o Firebase.
loginValidator.addRule('password', 'required');

/**
 * Validador pré-configurado para registro
 */
export const registerValidator = new FormValidator();
registerValidator.addRule('email', 'required|email');
registerValidator.addRule('password', 'required|strongPassword');
registerValidator.addRule('confirmPassword', 'required|match:password');
registerValidator.addRule('displayName', 'required|min:2|max:100');
