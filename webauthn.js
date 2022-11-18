import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
} from "@simplewebauthn/server";
import base64url from "base64url";
import { randomBytes } from "crypto";

const TIMEOUT = 60 * 1000;

export function getRegistrationOptions(email, existingCredentials) {
  try {
    const excludeCredentials = [];
    if (existingCredentials.length) {
      for (let cred of existingCredentials) {
        excludeCredentials.push({
          id: cred.credentialId,
          type: "public-key",
          transports: ["internal"],
        });
      }
    }

    const options = generateRegistrationOptions({
      rpName: process.env.RP_NAME,
      rpID: process.env.HOSTNAME,
      userID: randomBytes(32),
      userName: email,
      timeout: TIMEOUT,
      excludeCredentials,
      attestationType: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    return options;
  } catch (e) {
    throw e;
  }
}

export function getLoginOptions(existingCredentials) {
  try {
    const allowCredentials = existingCredentials.map((cred) => {
      return {
        type: "public-key",
        transports: ["internal"],
        id: base64url.toBuffer(cred.credentialId),
      };
    });

    const options = generateAuthenticationOptions({
      timeout: TIMEOUT,
      rpID: process.env.HOSTNAME,
      allowCredentials,
      userVerification: "required",
    });

    return options;
  } catch (e) {
    throw e;
  }
}
