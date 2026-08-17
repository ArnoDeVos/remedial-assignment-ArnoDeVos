/**
 * Authentication service.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import environment from '../config/environment.js';
import { AuthenticationError, ConflictError, ValidationError } from '../errors/ApplicationError.js';
import { presentResident } from '../utils/presenters.js';

export default class AuthService {
  /**
   * @param {object} dependencies Injected collaborators.
   * @param {import('../repositories/ResidentRepository.js').default} dependencies.residentRepository
   *   Access to resident accounts.
   * @param {import('../repositories/NeighbourhoodRepository.js').default} dependencies.neighbourhoodRepository
   *   Used to check that a chosen home zone exists.
   */
  constructor({ residentRepository, neighbourhoodRepository }) {
    this.residentRepository = residentRepository;
    this.neighbourhoodRepository = neighbourhoodRepository;
  }

  /**
   * Registers a new resident.
   *
   * @param {object} input Validated registration payload.
   * @param {string} input.email E-mail address, already lower-cased.
   * @param {string} input.displayName Name shown next to their sightings.
   * @param {string} input.password Plain text password, hashed here and
   *   never stored or logged.
   * @param {string} [input.homeZoneCode] Zone the resident lives in.
   * @returns {Promise<{resident: object, token: string}>} The new account and a
   *   token, so registering logs you straight in.
   * @throws {ConflictError} When the e-mail address is already registered.
   * @throws {ValidationError} When the home zone does not exist.
   */
  async register({ email, displayName, password, homeZoneCode }) {
    const existing = await this.residentRepository.findByEmail(email);

    if (existing) {
      throw new ConflictError('That e-mail address is already registered.');
    }

    if (homeZoneCode) {
      const zoneCodes = await this.neighbourhoodRepository.findZoneCodes();

      if (!zoneCodes.has(homeZoneCode)) {
        throw new ValidationError('That zone does not exist.', {
          homeZoneCode: 'Pick one of the zones on the map.',
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, environment.auth.bcryptRounds);

    const resident = await this.residentRepository.createResident({
      email,
      display_name: displayName,
      password_hash: passwordHash,
      home_zone_code: homeZoneCode ?? null,
    });

    return {
      resident: presentResident(resident),
      token: this.issueToken(resident),
    };
  }

  /**
   * Verifies credentials and issues a token.
   *
   * @param {object} input Validated login payload.
   * @param {string} input.email E-mail address, already lower-cased.
   * @param {string} input.password Plain text password.
   * @returns {Promise<{resident: object, token: string}>} The account and token.
   * @throws {AuthenticationError} When the credentials do not check out.
   */
  async login({ email, password }) {
    const resident = await this.residentRepository.findByEmailWithPassword(email);

    // Hash against a dummy value when the account does not exist, so a missing
    // account and a wrong password take the same amount of time to answer.
    const passwordHash = resident?.password_hash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
    const matches = await bcrypt.compare(password, passwordHash);

    if (!resident || !matches) {
      throw new AuthenticationError('That e-mail address and password do not match.');
    }

    if (!resident.is_active) {
      throw new AuthenticationError('This account has been deactivated.');
    }

    await this.residentRepository.touchLastLogin(resident.id);

    return {
      resident: presentResident(resident),
      token: this.issueToken(resident),
    };
  }

  /**
   * Signs a JSON Web Token for a resident.
   *
   * @param {object} resident Row from the residents table.
   * @returns {string} A signed token.
   */
  issueToken(resident) {
    return jwt.sign(
      { sub: resident.id, role: resident.role },
      environment.auth.jwtSecret,
      { expiresIn: environment.auth.jwtExpiresIn },
    );
  }

  /**
   * Verifies a token and returns the resident it belongs to.
   *
   * @param {string} token The bearer token from the Authorization header.
   * @returns {Promise<object>} The resident row, without the password hash.
   * @throws {AuthenticationError} When the token is invalid, expired or points at an account that no longer exists or has been deactivated.
   */
  async resolveResidentFromToken(token) {
    let payload;

    try {
      payload = jwt.verify(token, environment.auth.jwtSecret);
    } catch (error) {
      throw new AuthenticationError(
        error.name === 'TokenExpiredError'
          ? 'Your session has expired, please sign in again.'
          : 'That session token is not valid.',
      );
    }

    const resident = await this.residentRepository.findPublicById(payload.sub);

    if (!resident || !resident.is_active) {
      throw new AuthenticationError('This account is no longer active.');
    }

    return resident;
  }
}
