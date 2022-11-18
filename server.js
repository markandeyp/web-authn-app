import express from "express";
import session from "express-session";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { resolve } from "path";
import base64url from "base64url";
import {
  getUser,
  addUser,
  getNotes,
  addNote,
  getUserCredentials,
  getUserCredential,
  addUserCredential,
} from "./sqlite.js";
import { getRegistrationOptions, getLoginOptions } from "./webauthn.js";
import {
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
const { sign, verify } = jwt;
const app = express();

const port = process.env.PORT || 8080;
const host = process.env.HOST || "0.0.0.0";
process.env.RP_NAME = "Web Authn";
process.env.HOSTNAME = "localhost";
const jwtSecret = "$3)r3t";

app.use(express.static("assets"));
app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", 1);
app.use(
  session({
    secret: jwtSecret,
    resave: true,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: false,
    },
  })
);

const verifyToken = (req) => {
  const { token } = req.cookies;
  if (token) {
    try {
      const decodedToken = verify(token, jwtSecret);
      return decodedToken;
    } catch (err) {
      return false;
    }
  } else {
    return false;
  }
};

app.post("/authenticate", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: "Email is required" });
  } else {
    const user = await getUser(email);
    let credentials = [];
    if (user) {
      credentials = await getUserCredentials(user.id);
    }
    const options =
      !user || !credentials.length
        ? getRegistrationOptions(email, credentials)
        : getLoginOptions(credentials);

    req.session.challenge = options.challenge;
    req.session.email = email;

    return res.status(200).json({
      success: true,
      create: !user || !credentials.length,
      authOptions: options,
    });
  }
});

app.post("/signup/verify", async (req, res) => {
  const { challenge: expectedChallenge, email } = req.session;
  const expectedRPID = process.env.HOSTNAME;
  const expectedOrigin = "http://localhost:8080";

  try {
    const verification = await verifyRegistrationResponse({
      credential: req.body,
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
    });

    const { verified, registrationInfo } = verification;

    if (!verified) {
      throw "User verification failed.";
    }

    const { credentialPublicKey, credentialID } = registrationInfo;
    const base64PublicKey = base64url.encode(credentialPublicKey);
    const base64CredentialID = base64url.encode(credentialID);

    let user = await getUser(email);

    if (!user) {
      await addUser(email);
      user = await getUser(email);
    }

    const existingCredential = await getUserCredential(
      user.id,
      base64CredentialID
    );

    if (!existingCredential) {
      await addUserCredential(user.id, base64CredentialID, base64PublicKey);
    }

    delete req.session.challenge;
    const token = sign({ user }, jwtSecret, { expiresIn: "4h" });
    return res.status(200).json({ success: true, token: token });
  } catch (error) {
    console.log(error);
    delete req.session.challenge;
    delete req.session.email;
    res.status(400).send({ error });
  }
});

app.post("/login/verify", async (req, res) => {
  const { email, challenge: expectedChallenge } = req.session;
  const expectedOrigin = "http://localhost:8080";
  const expectedRPID = process.env.HOSTNAME;

  console.log(expectedChallenge, req.body.id);

  const user = await getUser(email);

  try {
    const existingCredential = await getUserCredential(user.id, req.body.id);

    if (!existingCredential) {
      throw "Authenticating credential not found.";
    }

    console.log(existingCredential);

    const credential = {};
    credential.credentialPublicKey = base64url.toBuffer(
      existingCredential.credentialKey
    );
    credential.credentialID = base64url.toBuffer(
      existingCredential.credentialId
    );

    const verification = await verifyAuthenticationResponse({
      credential: req.body,
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
      authenticator: credential,
    });

    const { verified } = verification;

    if (!verified) {
      throw "User verification failed.";
    }

    delete req.session.challenge;
    const token = sign({ user }, jwtSecret, { expiresIn: "4h" });
    return res.status(200).json({ success: true, token: token });
  } catch (e) {
    console.log(e);
    delete req.session.challenge;
    res.status(400).json({ error: e });
  }
});

app.post("/login", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: "Email is required" });
  } else {
    let user = await getUser(email);
    if (!user) {
      await addUser(email);
      user = await getUser(email);
    }
    const token = sign({ user }, jwtSecret, { expiresIn: "4h" });
    return res.status(200).json({ success: true, token: token });
  }
});

app.get("/user", async (req, res) => {
  const tokenData = verifyToken(req);
  if (tokenData) {
    return res.json({ success: true, user: tokenData.user });
  } else {
    return res.status(401).json({ success: false });
  }
});

app.get("/notes", async (req, res) => {
  const tokenData = verifyToken(req);
  if (tokenData) {
    const { id } = tokenData.user;
    const notes = await getNotes(id);
    res.status(200).json({ success: true, notes });
  } else {
    return res.status(401).json({ success: false });
  }
});

app.post("/notes", async (req, res) => {
  const tokenData = verifyToken(req);
  if (tokenData) {
    const { text } = req.body;
    const { id } = tokenData.user;
    await addNote(id, text);
    res.status(200).json({ success: true });
  } else {
    return res.status(401).json({ success: false });
  }
});

app.get("/", (req, res) => {
  const tokenData = verifyToken(req);
  if (!tokenData) {
    res.sendFile(resolve("index.html"));
  } else {
    res.sendFile(resolve("home.html"));
  }
});

app.listen(port, host, () => {
  console.log(`Server is running @ ${host}:${port}`);
});
