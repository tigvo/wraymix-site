import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

function getSecret() {
  const secret = process.env.CLIENT_LINK_SECRET;

  if (!secret) {
    throw new Error("CLIENT_LINK_SECRET が設定されていません。");
  }

  return secret;
}

export function createClientBookingToken(bookingId: number) {
  return createHmac("sha256", getSecret())
    .update(`wraymix-client-booking-v1:${bookingId}`)
    .digest("base64url");
}

export function verifyClientBookingToken(bookingId: number, token: string) {
  const expected = createClientBookingToken(bookingId);

  const actualBuffer = Buffer.from(token);

  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function createClientBookingPath(bookingId: number) {
  const token = createClientBookingToken(bookingId);

  return `/project/${bookingId}?token=${encodeURIComponent(token)}`;
}
