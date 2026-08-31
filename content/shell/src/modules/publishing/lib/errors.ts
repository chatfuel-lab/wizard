/**
 * One sentence out of whatever was thrown.
 *
 * `errorMessageFor` is the shared lookup; the messages table it takes stays
 * empty here on purpose. The api-client already carries the platform's message
 * and its code on the error, so there is nothing to translate — an Instagram
 * refusal is worth more in Instagram's own words than in ours, and the codes
 * (InstagramCarouselSizeInvalid, InstagramPublishCaptionTooLong) name the field
 * that is wrong better than a rewrite would.
 */
import { errorMessageFor } from '~api';

export const errorMessage = (err: unknown): string => errorMessageFor(err, {});
