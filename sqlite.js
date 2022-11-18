import { existsSync } from "fs";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
const dbFile = "./.data/users.db";

const exists = existsSync(dbFile);

const ddlQueries = {
  users: `CREATE TABLE Users 
    (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      email TEXT UNIQUE
    )`,
  userCredentials: `CREATE TABLE UserCredentials 
    (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      userId INTEGER NOT NULL, 
      credentialId TEXT NOT NULL,
      credentialKey TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES Users (id)
    )`,
  notes: `CREATE TABLE Notes 
    (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      userId INTEGER NOT NULL, 
      text TEXT, 
      FOREIGN KEY (userId) REFERENCES Users (id)
    )`,
};

let db;

open({
  filename: dbFile,
  driver: sqlite3.Database,
}).then(async (dBase) => {
  db = dBase;

  try {
    if (!exists) {
      await db.run(ddlQueries.users);
      await db.run(ddlQueries.userCredentials);
      await db.run(ddlQueries.notes);
    }
  } catch (dbError) {
    console.error(dbError);
  }
});

export const getUser = async (email) => {
  try {
    return await db.get("SELECT * FROM Users WHERE email = ? ", email);
  } catch (dbError) {
    console.error(dbError);
  }
};

export const getUserCredentials = async (userId) => {
  try {
    return await db.all(
      "SELECT * FROM UserCredentials WHERE userId = ? ",
      userId
    );
  } catch (dbError) {
    console.error(dbError);
  }
};

export const getUserCredential = async (userId, credentialID) => {
  try {
    return await db.get(
      "SELECT * FROM UserCredentials WHERE userId = ? and credentialId = ?",
      userId,
      credentialID
    );
  } catch (dbError) {
    console.error(dbError);
  }
};

export const addUser = async (email) => {
  let success = false;
  try {
    success = await db.run("INSERT INTO Users (email) VALUES (?)", [email]);
  } catch (dbError) {
    console.error(dbError);
  }
  return success.changes > 0 ? true : false;
};

export const addUserCredential = async (
  userId,
  credentialId,
  credentialKey
) => {
  let success = false;
  try {
    success = await db.run(
      "INSERT INTO UserCredentials (userId, credentialId, credentialKey) VALUES (?,?,?)",
      [userId, credentialId, credentialKey]
    );
  } catch (dbError) {
    console.error(dbError);
  }
  return success.changes > 0 ? true : false;
};

export const getNotes = async (userId) => {
  try {
    return await db.all("SELECT * FROM Notes WHERE userId = ? ", userId);
  } catch (dbError) {
    console.error(dbError);
  }
};

export const addNote = async (userId, text) => {
  let success = false;
  try {
    success = await db.run("INSERT INTO Notes (userId, text) VALUES (?,?)", [
      userId,
      text,
    ]);
  } catch (dbError) {
    console.error(dbError);
  }
  return success.changes > 0 ? true : false;
};

export const deleteNote = async (noteId) => {
  let success = false;
  try {
    success = await db.run("Delete FROM Notes WHERE id = ?", noteId);
  } catch (dbError) {
    console.error(dbError);
  }
  return success.changes > 0 ? true : false;
};
