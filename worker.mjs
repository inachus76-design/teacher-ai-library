import { pbkdf2Sync } from 'node:crypto';

const encode = value => new TextEncoder().encode(value);
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
const hashToken = async token => hex(await crypto.subtle.digest('SHA-256', encode(token)));
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const sections = new Set(['categories', 'resources', 'attachments']);
const cookie = (token, age) => 'teacher_session=' + token + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=' + age;

function passwordHash(password, salt) {
  return pbkdf2Sync(password, salt, 600000, 32, 'sha256').toString('hex');
}

function equalHash(a, b) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function json(value, status = 200, headers = {}) {
  return Response.json(value, {status, headers:{'Cache-Control':'no-store', ...headers}});
}

async function api(request, env, url) {
  const {pathname: path, origin} = url;
  const db = env.DB;
  const token = request.headers.get('Cookie')?.match(/(?:^|;\s*)teacher_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (request.method !== 'GET' && request.headers.get('Origin') !== origin) return json({},403);
  const tokenHash = token && await hashToken(token);
  const session = tokenHash && await db.prepare('SELECT teacher_id FROM sessions WHERE token_hash=? AND expires>?')
    .bind(tokenHash, Date.now()).first();
  if (path === '/api/session' && request.method === 'GET') return json({id:session?.teacher_id || null});
  if (path === '/api/logout' && request.method === 'POST') {
    if (tokenHash) await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(tokenHash).run();
    return json({},200,{'Set-Cookie':cookie('',0)});
  }
  if (['/api/signup','/api/login'].includes(path) && request.method === 'POST') {
    const {username, password} = await request.json();
    if (typeof username !== 'string' || typeof password !== 'string' || !/^[a-zA-Z0-9_.-]{3,40}$/.test(username) || password.length < 12 || password.length > 128) return json({},400);
    const name = username.toLowerCase();
    let teacher;
    if (path === '/api/signup') {
      const id = random();
      const salt = random();
      const digest = await passwordHash(password,salt);
      const result = await db.prepare('INSERT INTO teachers VALUES (?,?,?,?) ON CONFLICT(username) DO NOTHING')
        .bind(id,name,salt,digest).run();
      if (!result.meta.changes) return json({},409);
      teacher = {id};
    } else {
      teacher = await db.prepare('SELECT * FROM teachers WHERE username=?').bind(name).first();
      const digest = await passwordHash(password,teacher?.salt || '00000000000000000000000000000000');
      if (!teacher || !equalHash(digest,teacher.password_hash)) return json({},401);
    }
    const fresh = random();
    const age = 7 * 86400;
    await db.prepare('INSERT INTO sessions VALUES (?,?,?)').bind(await hashToken(fresh),teacher.id,Date.now()+age*1000).run();
    return json({id:teacher.id},200,{'Set-Cookie':cookie(fresh,age)});
  }

  const match = path.match(/^\/api\/library\/([a-f0-9]{64})(?:\/(categories|resources|attachments))?$/);
  if (!match) return json({},404);
  const [,id,section] = match;
  if (!section && request.method === 'GET') {
    const owner = await db.prepare('SELECT id FROM teachers WHERE id=?').bind(id).first();
    if (!owner) return json({},404);
    const {results} = await db.prepare('SELECT section,payload FROM library WHERE teacher_id=?').bind(id).all();
    return json(Object.fromEntries(results.map(row => [row.section,JSON.parse(row.payload)])));
  }
  if (sections.has(section) && request.method === 'PUT') {
    if (session?.teacher_id !== id) return json({},403);
    if (Number(request.headers.get('Content-Length')) > 900000) return json({},413);
    const payload = await request.text();
    if (encode(payload).length > 900000) return json({},413);
    const data = JSON.parse(payload);
    if (!data || typeof data !== 'object' || Array.isArray(data) !== (section === 'categories')) return json({},400);
    await db.prepare('INSERT INTO library VALUES (?,?,?) ON CONFLICT(teacher_id,section) DO UPDATE SET payload=excluded.payload')
      .bind(id,section,payload).run();
    return json({});
  }
  return json({},405);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      return await api(request,env,url);
    } catch (error) {
      if (error instanceof SyntaxError) return json({},400);
      console.error(error);
      return json({},500);
    }
  }
};

