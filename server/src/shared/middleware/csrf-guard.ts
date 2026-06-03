import { Request, Response, NextFunction } from 'express';

/**
 * Custom Header-based CSRF defense middleware (OWASP compliant).
 * 
 * Instead of validating volatile Origin/Referer headers (which can be stripped or altered
 * by legitimate proxies, VPNs, or privacy tools), we enforce the presence of a custom
 * header 'X-SupliList-Client' on all state-mutating requests (POST, PUT, PATCH, DELETE).
 * 
 * According to W3C and browser security models:
 * - Simple requests (HTML forms, standard link clicks, image tags) cannot set custom headers.
 * - Complex requests (AJAX/Fetch) can set custom headers, but browsers force a preflight CORS
 *   OPTIONS request. Our CORS configuration rejects unauthorized origins, rendering CSRF attacks
 *   impossible to execute from a browser environment.
 */
export const csrfGuard = (req: Request, res: Response, next: NextFunction) => {
  // Safe HTTP methods do not mutate state and are exempt from CSRF validation
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Validate presence of the custom client header
  const clientHeader = req.headers['x-suplilist-client'];

  if (!clientHeader || clientHeader !== '1') {
    return res.status(403).json({
      success: false,
      error: 'csrf_protection_triggered',
      message: 'Forbidden: Missing or invalid CSRF custom header (X-SupliList-Client).'
    });
  }

  next();
};
export default csrfGuard;
