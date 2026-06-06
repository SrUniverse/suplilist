export interface IEmailProvider {
  sendEmail(to: string, subject: string, html: string): Promise<boolean>;
}
