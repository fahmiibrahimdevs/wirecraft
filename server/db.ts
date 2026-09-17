import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Setup Data Directory for SQLite
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'wirecraft.db');
export const db = new DatabaseSync(dbPath);

// Enable WAL Mode for high concurrency and performance
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize Database Schema
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      avatar_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS circuit_folders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      parent_id TEXT,
      is_expanded INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS circuit_files (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      parent_id TEXT,
      name TEXT NOT NULL,
      components_json TEXT NOT NULL DEFAULT '[]',
      wires_json TEXT NOT NULL DEFAULT '[]',
      view_state_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Seed default admin account if not exists
  seedDefaultAdmin();
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function seedDefaultAdmin() {
  const stmt = db.prepare('SELECT id FROM users WHERE username = ?');
  const existing = stmt.get('fahmiibrahimdev') as { id: string } | undefined;

  if (!existing) {
    const adminId = 'user_admin_fahmiibrahimdev';
    const now = new Date().toISOString();
    const passwordHash = hashPassword('31750321@admin');

    const insertStmt = db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, avatar_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      adminId,
      'fahmiibrahimdev',
      'fahmiibrahimdev@wirecraft.io',
      passwordHash,
      'admin',
      '',
      now,
      now
    );

    // Also seed a welcome sample folder and circuit for the admin
    const folderStmt = db.prepare(`
      INSERT INTO circuit_folders (id, user_id, name, parent_id, is_expanded, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    folderStmt.run('folder_sample_admin', adminId, 'Contoh Rangkaian', null, 1, now, now);

    const fileStmt = db.prepare(`
      INSERT INTO circuit_files (id, user_id, parent_id, name, components_json, wires_json, view_state_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    fileStmt.run(
      'file_sample_arduino',
      adminId,
      'folder_sample_admin',
      'Latihan Sirkuit Arduino',
      '[]',
      '[]',
      '{}',
      now,
      now
    );

    console.log('✅ [Database] Default admin account seeded: fahmiibrahimdev (role: admin)');
  }
}
