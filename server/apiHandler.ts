import type { IncomingMessage, ServerResponse } from 'node:http';
import crypto from 'node:crypto';
import { db, initDatabase } from './db.ts';
import {
  hashPassword,
  verifyPassword,
  createJWT,
  getUserFromRequest,
  UserJWTPayload,
} from './auth.ts';

// Ensure DB is initialized
initDatabase();

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Only handle /api/auth, /api/circuits, and /api/admin routes here
  if (
    !pathname.startsWith('/api/auth') &&
    !pathname.startsWith('/api/circuits') &&
    !pathname.startsWith('/api/admin')
  ) {
    return false;
  }

  // Set CORS headers for API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  try {
    // ----------------------------------------------------
    // AUTH ROUTES
    // ----------------------------------------------------

    // 1. POST /api/auth/register
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { username, email, password } = body;

      if (!username || !email || !password) {
        sendJson(res, 400, { success: false, error: 'Username, email, dan password wajib diisi.' });
        return true;
      }

      if (username.length < 3) {
        sendJson(res, 400, { success: false, error: 'Username minimal 3 karakter.' });
        return true;
      }

      if (password.length < 6) {
        sendJson(res, 400, { success: false, error: 'Password minimal 6 karakter.' });
        return true;
      }

      // Check existing user
      const existingUser = db
        .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
        .get(username.trim().toLowerCase(), email.trim().toLowerCase()) as any;

      if (existingUser) {
        sendJson(res, 409, {
          success: false,
          error: 'Username atau email sudah terdaftar. Silakan login.',
        });
        return true;
      }

      const userId = 'usr_' + crypto.randomBytes(8).toString('hex');
      const now = new Date().toISOString();
      const passwordHash = hashPassword(password);
      const role = 'user'; // Default role
      const isActive = 1;

      db.prepare(`
        INSERT INTO users (id, username, email, password_hash, role, is_active, avatar_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        username.trim(),
        email.trim().toLowerCase(),
        passwordHash,
        role,
        isActive,
        '',
        now,
        now
      );

      const token = createJWT({
        id: userId,
        username: username.trim(),
        email: email.trim().toLowerCase(),
        role,
      });

      sendJson(res, 201, {
        success: true,
        token,
        user: {
          id: userId,
          username: username.trim(),
          email: email.trim().toLowerCase(),
          role,
          isActive: true,
          avatarUrl: '',
          createdAt: now,
        },
      });
      return true;
    }

    // 2. POST /api/auth/login
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { identifier, password } = body; // identifier can be username or email

      if (!identifier || !password) {
        sendJson(res, 400, {
          success: false,
          error: 'Username/email dan password wajib diisi.',
        });
        return true;
      }

      const cleanIdentifier = identifier.trim();
      const user = db
        .prepare('SELECT * FROM users WHERE username = ? OR email = ?')
        .get(cleanIdentifier, cleanIdentifier.toLowerCase()) as any;

      if (!user || !verifyPassword(password, user.password_hash)) {
        sendJson(res, 401, {
          success: false,
          error: 'Username atau password salah.',
        });
        return true;
      }

      // Check active status
      if (user.is_active === 0) {
        sendJson(res, 403, {
          success: false,
          error: 'Akun Anda telah dinonaktifkan oleh Administrator. Hubungi admin untuk informasi lebih lanjut.',
        });
        return true;
      }

      const token = createJWT({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      });

      sendJson(res, 200, {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: Boolean(user.is_active !== 0),
          avatarUrl: user.avatar_url || '',
          createdAt: user.created_at,
        },
      });
      return true;
    }

    // 3. GET /api/auth/me
    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const authUser = getUserFromRequest(req);
      if (!authUser) {
        sendJson(res, 401, { success: false, error: 'Unauthorized: Sesi tidak valid atau telah berakhir.' });
        return true;
      }

      const user = db.prepare('SELECT id, username, email, role, is_active, avatar_url, created_at FROM users WHERE id = ?').get(authUser.id) as any;
      if (!user) {
        sendJson(res, 404, { success: false, error: 'Pengguna tidak ditemukan.' });
        return true;
      }

      if (user.is_active === 0) {
        sendJson(res, 403, { success: false, error: 'Akun Anda telah dinonaktifkan oleh Administrator.' });
        return true;
      }

      sendJson(res, 200, {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: Boolean(user.is_active !== 0),
          avatarUrl: user.avatar_url || '',
          createdAt: user.created_at,
        },
      });
      return true;
    }

    // ----------------------------------------------------
    // ADMIN USER MANAGEMENT ROUTES
    // ----------------------------------------------------

    // 4. GET /api/admin/users (List all users)
    if (pathname === '/api/admin/users' && req.method === 'GET') {
      const authUser = getUserFromRequest(req);
      if (!authUser || authUser.role !== 'admin') {
        sendJson(res, 403, { success: false, error: 'Akses ditolak: Hanya Administrator yang berwenang.' });
        return true;
      }

      const rawUsers = db.prepare(`
        SELECT u.id, u.username, u.email, u.role, u.is_active, u.avatar_url, u.created_at, u.updated_at,
               (SELECT COUNT(*) FROM circuit_files cf WHERE cf.user_id = u.id) as file_count
        FROM users u
        ORDER BY u.created_at DESC
      `).all() as any[];

      const users = rawUsers.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        isActive: Boolean(u.is_active !== 0),
        fileCount: u.file_count || 0,
        avatarUrl: u.avatar_url || '',
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      }));

      sendJson(res, 200, { success: true, users });
      return true;
    }

    // 5. POST /api/admin/users/status (Toggle user active status)
    if (pathname === '/api/admin/users/status' && req.method === 'POST') {
      const authUser = getUserFromRequest(req);
      if (!authUser || authUser.role !== 'admin') {
        sendJson(res, 403, { success: false, error: 'Akses ditolak: Hanya Administrator yang berwenang.' });
        return true;
      }

      const body = await parseJsonBody(req);
      const { userId, isActive } = body;

      if (!userId || typeof isActive !== 'boolean') {
        sendJson(res, 400, { success: false, error: 'userId dan isActive wajib disertakan.' });
        return true;
      }

      if (userId === authUser.id && !isActive) {
        sendJson(res, 400, { success: false, error: 'Anda tidak dapat menonaktifkan akun Admin Anda sendiri.' });
        return true;
      }

      const targetUser = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(userId) as any;
      if (!targetUser) {
        sendJson(res, 404, { success: false, error: 'Pengguna tidak ditemukan.' });
        return true;
      }

      const now = new Date().toISOString();
      db.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?').run(
        isActive ? 1 : 0,
        now,
        userId
      );

      sendJson(res, 200, {
        success: true,
        message: `Status akun ${targetUser.username} berhasil diubah menjadi ${isActive ? 'Aktif' : 'Nonaktif'}.`,
        user: {
          id: targetUser.id,
          username: targetUser.username,
          isActive,
        },
      });
      return true;
    }

    // 6. POST /api/admin/users/role (Change user role)
    if (pathname === '/api/admin/users/role' && req.method === 'POST') {
      const authUser = getUserFromRequest(req);
      if (!authUser || authUser.role !== 'admin') {
        sendJson(res, 403, { success: false, error: 'Akses ditolak: Hanya Administrator yang berwenang.' });
        return true;
      }

      const body = await parseJsonBody(req);
      const { userId, role } = body;

      if (!userId || (role !== 'admin' && role !== 'user')) {
        sendJson(res, 400, { success: false, error: 'userId dan role valid (admin/user) wajib disertakan.' });
        return true;
      }

      if (userId === authUser.id) {
        sendJson(res, 400, { success: false, error: 'Anda tidak dapat mengubah role akun Anda sendiri.' });
        return true;
      }

      const now = new Date().toISOString();
      db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(role, now, userId);

      sendJson(res, 200, {
        success: true,
        message: `Role pengguna berhasil diubah menjadi ${role}.`,
      });
      return true;
    }

    // 7. POST /api/admin/users/delete (Delete user account)
    if (pathname === '/api/admin/users/delete' && req.method === 'POST') {
      const authUser = getUserFromRequest(req);
      if (!authUser || authUser.role !== 'admin') {
        sendJson(res, 403, { success: false, error: 'Akses ditolak: Hanya Administrator yang berwenang.' });
        return true;
      }

      const body = await parseJsonBody(req);
      const { userId } = body;

      if (!userId) {
        sendJson(res, 400, { success: false, error: 'userId wajib disertakan.' });
        return true;
      }

      if (userId === authUser.id) {
        sendJson(res, 400, { success: false, error: 'Anda tidak dapat menghapus akun Anda sendiri.' });
        return true;
      }

      db.prepare('DELETE FROM users WHERE id = ?').run(userId);

      sendJson(res, 200, {
        success: true,
        message: 'Pengguna berhasil dihapus secara permanen.',
      });
      return true;
    }

    // ----------------------------------------------------
    // CIRCUIT FILES & FOLDERS CLOUD SYNC ROUTES
    // ----------------------------------------------------

    // 8. GET /api/circuits/files
    if (pathname === '/api/circuits/files' && req.method === 'GET') {
      const authUser = getUserFromRequest(req);
      if (!authUser) {
        sendJson(res, 401, { success: false, error: 'Unauthorized' });
        return true;
      }

      const rawFolders = db.prepare('SELECT * FROM circuit_folders WHERE user_id = ? ORDER BY created_at ASC').all(authUser.id) as any[];
      const rawFiles = db.prepare('SELECT * FROM circuit_files WHERE user_id = ? ORDER BY created_at ASC').all(authUser.id) as any[];

      const folders = rawFolders.map((f) => ({
        id: f.id,
        name: f.name,
        parentId: f.parent_id,
        isExpanded: Boolean(f.is_expanded),
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      }));

      const files = rawFiles.map((f) => ({
        id: f.id,
        name: f.name,
        parentId: f.parent_id,
        components: JSON.parse(f.components_json || '[]'),
        wires: JSON.parse(f.wires_json || '[]'),
        viewState: JSON.parse(f.view_state_json || '{}'),
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      }));

      sendJson(res, 200, {
        success: true,
        fileSystem: {
          folders,
          files,
        },
      });
      return true;
    }

    // 9. POST /api/circuits/sync (Full sync / merge from client)
    if (pathname === '/api/circuits/sync' && req.method === 'POST') {
      const authUser = getUserFromRequest(req);
      if (!authUser) {
        sendJson(res, 401, { success: false, error: 'Unauthorized' });
        return true;
      }

      const body = await parseJsonBody(req);
      const { folders = [], files = [] } = body;
      const now = new Date().toISOString();

      // Transaction-like batch upsert
      db.exec('BEGIN TRANSACTION;');
      try {
        // Clear old items for this user to ensure complete synchronization
        db.prepare('DELETE FROM circuit_files WHERE user_id = ?').run(authUser.id);
        db.prepare('DELETE FROM circuit_folders WHERE user_id = ?').run(authUser.id);

        const insertFolder = db.prepare(`
          INSERT INTO circuit_folders (id, user_id, name, parent_id, is_expanded, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const folder of folders) {
          insertFolder.run(
            folder.id,
            authUser.id,
            folder.name,
            folder.parentId || null,
            folder.isExpanded !== false ? 1 : 0,
            folder.createdAt || now,
            folder.updatedAt || now
          );
        }

        const insertFile = db.prepare(`
          INSERT INTO circuit_files (id, user_id, parent_id, name, components_json, wires_json, view_state_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const file of files) {
          insertFile.run(
            file.id,
            authUser.id,
            file.parentId || null,
            file.name,
            JSON.stringify(file.components || []),
            JSON.stringify(file.wires || []),
            JSON.stringify(file.viewState || {}),
            file.createdAt || now,
            file.updatedAt || now
          );
        }

        db.exec('COMMIT;');
        sendJson(res, 200, { success: true, message: 'Sinkronisasi berhasil.' });
        return true;
      } catch (err: any) {
        db.exec('ROLLBACK;');
        sendJson(res, 500, { success: false, error: err.message || 'Gagal melakukan sinkronisasi database.' });
        return true;
      }
    }

    sendJson(res, 404, { success: false, error: 'API route not found' });
    return true;
  } catch (err: any) {
    console.error('API Error:', err);
    sendJson(res, 500, { success: false, error: err.message || 'Internal Server Error' });
    return true;
  }
}
