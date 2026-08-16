/**
 * Stage 3 — spatial checks.
 */

import { ValidationError } from '../../errors/ApplicationError.js';
import { isWithinBounds, resolveZone } from '../../domain/neighbourhood.js';

const boundsStage = {
  name: 'bounds',

  /**
   * @param {object} context Shared pipeline context.
   * @returns {void}
   */
  process(context) {
    const { positionX, positionY } = context.input;

    if (!isWithinBounds(positionX, positionY)) {
      throw new ValidationError('That location is outside the neighbourhood.', {
        positionX: 'Pick a spot on the map.',
        positionY: 'Pick a spot on the map.',
      });
    }

    const zone = resolveZone(positionX, positionY);

    if (!zone) {
      throw new ValidationError('That location does not belong to any zone.', {
        positionX: 'Pick a spot inside one of the marked zones.',
      });
    }

    context.record.position_x = positionX;
    context.record.position_y = positionY;
    context.record.zone_code = zone.code;
    context.zone = zone;
  },
};

export default boundsStage;
