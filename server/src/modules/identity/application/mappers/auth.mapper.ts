import type { AuthResponseDTO, RegisterResponseDTO } from '@suplilist/shared';

/**
 * AuthMapper — shapes auth use-case results into wire DTOs.
 *
 * Invariants enforced here:
 *  - `refreshToken` is NEVER included in any returned DTO.
 *    It is injected as an HttpOnly Set-Cookie header by the controller.
 *  - MFA internals are never forwarded. The controller uses mfaTicket separately
 *    for the step-up flow and it is not part of AuthResponseDTO.
 */
export class AuthMapper {
  /**
   * Shape the login / refresh result into the body DTO.
   * The caller (controller) is responsible for setting the refreshToken cookie.
   */
  static toAuthResponse(accessToken: string): AuthResponseDTO {
    return { accessToken };
  }

  /**
   * Shape the register result into the body DTO.
   */
  static toRegisterResponse(
    userId: string,
    email: string,
  ): RegisterResponseDTO {
    return { userId, email, status: 'active' };
  }
}

export default AuthMapper;
