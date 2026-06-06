import { IEmailProvider } from '../../../../shared/infrastructure/email/email-provider.interface.js';

export class IdentityEmailService {
  constructor(private emailProvider: IEmailProvider) {}

  async sendVerificationEmail(email: string, otpCode: string): Promise<void> {
    const subject = 'Verificação de E-mail - SupliList';
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Bem-vindo(a) ao SupliList!</h2>
        <p>Obrigado por criar sua conta.</p>
        <p>Para ativar o seu perfil e garantir a segurança da sua conta, use o código de verificação abaixo:</p>
        <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 8px; text-align: center;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #28a745;">${otpCode}</span>
        </div>
        <p style="margin-top: 20px; font-size: 13px; color: #666;">Este código expira em 15 minutos.</p>
        <p style="font-size: 12px; color: #999;">Se você não solicitou a criação desta conta, por favor ignore este e-mail.</p>
      </div>
    `;

    await this.emailProvider.sendEmail(email, subject, html);
  }

  async sendDeviceVerificationEmail(email: string, otpCode: string): Promise<void> {
    const subject = 'Novo Dispositivo Detectado - SupliList';
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Confirmação de Segurança</h2>
        <p>Detectamos um login a partir de um novo dispositivo ou navegador.</p>
        <p>Para prosseguir com o login e registrar este dispositivo como confiável, insira o código abaixo:</p>
        <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 8px; text-align: center;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #007bff;">${otpCode}</span>
        </div>
        <p style="margin-top: 20px; font-size: 13px; color: #666;">Este código expira em 15 minutos.</p>
        <p style="font-size: 12px; color: #999;">Se você não tentou fazer login, altere sua senha imediatamente.</p>
      </div>
    `;

    await this.emailProvider.sendEmail(email, subject, html);
  }

  async sendDuplicateRegistrationWarning(email: string): Promise<void> {
    const loginLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
    const subject = 'Tentativa de registro de conta no SupliList';
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Aviso de Segurança</h2>
        <p>Alguém (esperamos que você) tentou criar uma nova conta no SupliList usando este endereço de e-mail.</p>
        <p>Você já possui uma conta ativa conosco! Para acessar seu painel, basta fazer o login abaixo:</p>
        <a href="${loginLink}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px;">Fazer Login</a>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">Se você não tentou criar uma nova conta, sua segurança não foi comprometida, mas recomendamos o uso de senhas fortes.</p>
      </div>
    `;

    await this.emailProvider.sendEmail(email, subject, html);
  }

  async sendPasswordResetEmail(email: string, plainToken: string): Promise<void> {
    const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${plainToken}`;
    const subject = 'Recuperação de Senha - SupliList';
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Recuperação de Senha</h2>
        <p>Recebemos um pedido para redefinir a sua senha no SupliList.</p>
        <p>Clique no botão abaixo para escolher uma nova senha. Este link é válido apenas por <strong>15 minutos</strong>.</p>
        <a href="${link}" style="display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px;">Redefinir Senha</a>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">Se você não fez essa solicitação, pode ignorar este e-mail com segurança. Sua senha permanecerá a mesma.</p>
      </div>
    `;

    await this.emailProvider.sendEmail(email, subject, html);
  }
}
