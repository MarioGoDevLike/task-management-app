import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  getCountFromServer,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { getDb, getFirebaseAuth, getFirebaseWebApiKey } from '../firebase/app';

/** @type {string[]} */
export const AVAILABLE_PERMISSIONS = [
  'tasks.create',
  'tasks.update',
  'tasks.delete',
  'tasks.assign',
  'admin.access',
];

function apiError(message, status = 400) {
  const err = new Error(message);
  err.response = { data: { message }, status };
  return err;
}

function mapAuthMessage(code, fallback) {
  const map = {
    'auth/email-already-in-use': 'User with this email already exists',
    'auth/invalid-email': 'Invalid email',
    'auth/invalid-credential': 'Invalid email or password',
    'auth/wrong-password': 'Invalid email or password',
    'auth/user-not-found': 'Invalid email or password',
    'auth/weak-password': 'Password must be at least 6 characters',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
  };
  return map[code] || fallback || 'Authentication failed';
}

function tsToIso(v) {
  if (!v) return v;
  if (typeof v.toDate === 'function') return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  return v;
}

function computePermissions(profile, teamsById) {
  const roles = profile.roles || [];
  if (roles.includes('admin')) {
    return [...AVAILABLE_PERMISSIONS];
  }
  const set = new Set();
  (profile.teamIds || []).forEach((tid) => {
    const t = teamsById[tid];
    (t?.permissions || []).forEach((p) => set.add(p));
  });
  (profile.directPermissions || []).forEach((p) => set.add(p));
  return Array.from(set);
}

async function loadTeamsById() {
  const db = getDb();
  const snap = await getDocs(collection(db, 'teams'));
  /** @type {Record<string, object>} */
  const teamsById = {};
  snap.forEach((d) => {
    teamsById[d.id] = { _id: d.id, ...d.data() };
  });
  return teamsById;
}

function fullName(firstName, lastName, email) {
  const n = `${firstName || ''} ${lastName || ''}`.trim();
  return n || email || '';
}

async function getUserMini(uid, cache) {
  if (cache[uid]) return cache[uid];
  const db = getDb();
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) {
    cache[uid] = { _id: uid, id: uid, email: '', firstName: '', lastName: '' };
    return cache[uid];
  }
  const d = snap.data();
  cache[uid] = {
    _id: uid,
    id: uid,
    email: d.email || '',
    firstName: d.firstName || '',
    lastName: d.lastName || '',
    fullName: fullName(d.firstName, d.lastName, d.email),
  };
  return cache[uid];
}

function userDocToAppUser(data, uid, teamsById) {
  const teamsPopulated = (data.teamIds || [])
    .map((id) => teamsById[id])
    .filter(Boolean);
  const permissions = computePermissions(data, teamsById);
  return {
    id: uid,
    _id: uid,
    email: data.email || '',
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    fullName: fullName(data.firstName, data.lastName, data.email),
    roles: data.roles || ['member'],
    teams: teamsPopulated,
    permissions,
    lastLogin: tsToIso(data.lastLogin),
  };
}

async function loadAppUserForAuth(firebaseUser) {
  const db = getDb();
  const uref = doc(db, 'users', firebaseUser.uid);
  let usnap = await getDoc(uref);
  if (!usnap.exists()) {
    await setDoc(uref, {
      email: firebaseUser.email || '',
      firstName: '',
      lastName: '',
      roles: ['member'],
      teamIds: [],
      createdAt: serverTimestamp(),
    });
    usnap = await getDoc(uref);
  }
  const pdata = usnap.data();
  if (pdata.disabled) {
    await signOut(getFirebaseAuth());
    throw apiError('This account has been disabled.', 403);
  }
  const teamsById = await loadTeamsById();
  await updateDoc(uref, { lastLogin: serverTimestamp() }).catch(() => {});
  return userDocToAppUser(pdata, firebaseUser.uid, teamsById);
}

async function requireAuth() {
  const u = getFirebaseAuth().currentUser;
  if (!u) throw apiError('Unauthorized', 401);
  return u;
}

async function requireAdmin() {
  const u = await requireAuth();
  const db = getDb();
  const snap = await getDoc(doc(db, 'users', u.uid));
  const roles = snap.data()?.roles || [];
  if (!roles.includes('admin')) throw apiError('Forbidden', 403);
  return u;
}

async function hydrateTaskDoc(taskId, data) {
  const cache = {};
  const assigneeIds = data.assigneeIds || [];
  const assignees = await Promise.all(
    assigneeIds.map((id) => getUserMini(id, cache))
  );
  const userMini = data.userId ? await getUserMini(data.userId, cache) : null;
  return {
    _id: taskId,
    id: taskId,
    title: data.title,
    description: data.description || '',
    status: data.status || 'pending',
    priority: data.priority || 'medium',
    dueDate: tsToIso(data.dueDate),
    isArchived: !!data.isArchived,
    user: userMini,
    assignees,
    history: (data.history || []).map((h) => ({
      ...h,
      timestamp: tsToIso(h.timestamp) || h.timestamp,
    })),
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

async function fetchUserTasksMerged(uid) {
  const db = getDb();
  const col = collection(db, 'tasks');
  const q1 = query(
    col,
    where('assigneeIds', 'array-contains', uid),
    where('isArchived', '==', false)
  );
  const q2 = query(col, where('userId', '==', uid), where('isArchived', '==', false));
  const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const byId = {};
  s1.forEach((d) => {
    byId[d.id] = d;
  });
  s2.forEach((d) => {
    byId[d.id] = d;
  });
  return Object.values(byId);
}

export const firebaseAuthApi = {
  async login({ email, password }) {
    try {
      const auth = getFirebaseAuth();
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      const user = await loadAppUserForAuth(cred.user);
      return { data: { token, user } };
    } catch (e) {
      if (e.response?.data?.message) throw e;
      throw apiError(mapAuthMessage(e.code, e.message), 401);
    }
  },

  async register(body) {
    const { email, password, firstName, lastName } = body;
    try {
      const db = getDb();
      const count = await getCountFromServer(collection(db, 'users'));
      const isFirst = count.data().count === 0;
      const auth = getFirebaseAuth();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      await setDoc(doc(db, 'users', cred.user.uid), {
        email: email.toLowerCase(),
        firstName: firstName || '',
        lastName: lastName || '',
        roles: isFirst ? ['admin'] : ['member'],
        teamIds: [],
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });
      const teamsById = await loadTeamsById();
      const usnap = await getDoc(doc(db, 'users', cred.user.uid));
      const user = userDocToAppUser(usnap.data(), cred.user.uid, teamsById);
      return { data: { token, user } };
    } catch (e) {
      if (e.response?.data?.message) throw e;
      throw apiError(mapAuthMessage(e.code, e.message), 400);
    }
  },

  async logout() {
    await signOut(getFirebaseAuth());
    return { data: { message: 'Logged out' } };
  },

  async me() {
    const u = await requireAuth();
    const user = await loadAppUserForAuth(u);
    return { data: { user } };
  },
};

async function authRestSignUp(email, password) {
  const key = getFirebaseWebApiKey();
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const raw = data.error?.message || '';
    const code = raw.includes('EMAIL_EXISTS')
      ? 'auth/email-already-in-use'
      : raw.includes('WEAK_PASSWORD')
        ? 'auth/weak-password'
        : '';
    throw apiError(mapAuthMessage(code, raw) || raw || 'Could not create user', 400);
  }
  return data.localId;
}

export const firebaseTasksApi = {
  async getTasks(params = {}) {
      const u = await requireAuth();
      const page = Math.max(1, parseInt(params.page, 10) || 1);
      const pageSize = Math.min(100, parseInt(params.limit, 10) || 10);
      const sortBy = params.sortBy || 'createdAt';
      const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
      const docs = await fetchUserTasksMerged(u.uid);
      let list = await Promise.all(docs.map((d) => hydrateTaskDoc(d.id, d.data())));
      if (params.status) list = list.filter((t) => t.status === params.status);
      if (params.priority) list = list.filter((t) => t.priority === params.priority);
      list.sort((a, b) => {
        const av = a[sortBy];
        const bv = b[sortBy];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av < bv) return sortOrder * -1;
        if (av > bv) return sortOrder * 1;
        return 0;
      });
      const total = list.length;
      const pages = Math.max(1, Math.ceil(total / pageSize));
      const slice = list.slice((page - 1) * pageSize, page * pageSize);
      return {
        data: {
          tasks: slice,
          pagination: { current: page, pages, total },
        },
      };
    },

  async getTask(id) {
      const u = await requireAuth();
      const db = getDb();
      const tref = doc(db, 'tasks', id);
      const snap = await getDoc(tref);
      if (!snap.exists()) throw apiError('Task not found', 404);
      const d = snap.data();
      const ok =
        d.userId === u.uid || (d.assigneeIds || []).includes(u.uid);
      if (!ok) throw apiError('Forbidden', 403);
      return { data: await hydrateTaskDoc(id, d) };
    },

  async createTask(body) {
      const u = await requireAuth();
      const db = getDb();
      const assignees = [...(body.assignees || [])];
      if (!assignees.includes(u.uid)) assignees.push(u.uid);
      const tref = doc(collection(db, 'tasks'));
      const payload = {
        title: body.title,
        description: body.description || '',
        status: body.status || 'pending',
        priority: body.priority || 'medium',
        dueDate: body.dueDate || null,
        userId: u.uid,
        assigneeIds: assignees,
        isArchived: false,
        history: [
          {
            action: 'created',
            actor: u.uid,
            changes: body,
            timestamp: new Date().toISOString(),
          },
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(tref, payload);
      const snap = await getDoc(tref);
      return { data: await hydrateTaskDoc(tref.id, snap.data()) };
    },

  async updateTask(id, body) {
      const u = await requireAuth();
      const db = getDb();
      const tref = doc(db, 'tasks', id);
      const snap = await getDoc(tref);
      if (!snap.exists()) throw apiError('Task not found', 404);
      const existing = snap.data();
      const ok =
        existing.userId === u.uid || (existing.assigneeIds || []).includes(u.uid);
      if (!ok) throw apiError('Forbidden', 403);
      const fields = {};
      ['title', 'description', 'status', 'priority', 'dueDate'].forEach((k) => {
        if (body[k] !== undefined) fields[k] = body[k];
      });
      if (body.assignees) {
        fields.assigneeIds = body.assignees;
      }
      const historyEntry = {
        action: 'updated',
        actor: u.uid,
        changes: body,
        timestamp: new Date().toISOString(),
      };
      await updateDoc(tref, {
        ...fields,
        updatedAt: serverTimestamp(),
        history: [...(existing.history || []), historyEntry],
      });
      const next = await getDoc(tref);
      return { data: await hydrateTaskDoc(id, next.data()) };
    },

  async deleteTask(id) {
      const u = await requireAuth();
      const db = getDb();
      const tref = doc(db, 'tasks', id);
      const snap = await getDoc(tref);
      if (!snap.exists()) throw apiError('Task not found', 404);
      const existing = snap.data();
      const ok =
        existing.userId === u.uid || (existing.assigneeIds || []).includes(u.uid);
      if (!ok) throw apiError('Forbidden', 403);
      await updateDoc(tref, {
        isArchived: true,
        updatedAt: serverTimestamp(),
        history: [
          ...(existing.history || []),
          { action: 'archived', actor: u.uid, timestamp: new Date().toISOString() },
        ],
      });
      return { data: { message: 'Task archived' } };
    },

  async assignTask(taskId, assignees) {
      const u = await requireAuth();
      const db = getDb();
      const tref = doc(db, 'tasks', taskId);
      const snap = await getDoc(tref);
      if (!snap.exists()) throw apiError('Task not found', 404);
      const existing = snap.data();
      const isAssigned = (existing.assigneeIds || []).includes(u.uid);
      const isOwner = existing.userId === u.uid;
      const userSnap = await getDoc(doc(db, 'users', u.uid));
      const isAdminUser = (userSnap.data()?.roles || []).includes('admin');
      if (!isAdminUser && !isAssigned && !isOwner) {
        throw apiError('Forbidden', 403);
      }
      const assigneeIds = assignees || [];
      await updateDoc(tref, {
        assigneeIds,
        updatedAt: serverTimestamp(),
        history: [
          ...(existing.history || []),
          {
            action: 'assignees_updated',
            actor: u.uid,
            changes: { assigneeIds },
            timestamp: new Date().toISOString(),
          },
        ],
      });
      const next = await getDoc(tref);
      const task = await hydrateTaskDoc(taskId, next.data());
      return { data: { task, message: 'Updated' } };
    },
};

export const firebaseTeamsApi = {
  async listTeams() {
      await requireAuth();
      const db = getDb();
      const snap = await getDocs(collection(db, 'teams'));
      const teams = [];
      snap.forEach((d) => teams.push({ _id: d.id, id: d.id, ...d.data() }));
      return { data: { teams } };
    },

  async getTeam(id) {
      await requireAuth();
      const db = getDb();
      const snap = await getDoc(doc(db, 'teams', id));
      if (!snap.exists()) throw apiError('Team not found', 404);
      return { data: { team: { _id: id, id, ...snap.data() } } };
    },

  async createTeam(body) {
      await requireAdmin();
      const db = getDb();
      const tref = doc(collection(db, 'teams'));
      await setDoc(tref, {
        name: body.name,
        description: body.description || '',
        color: body.color || '#3b82f6',
        icon: body.icon || 'users',
        permissions: body.permissions || [],
        createdAt: serverTimestamp(),
      });
      const snap = await getDoc(tref);
      return { data: { team: { _id: tref.id, id: tref.id, ...snap.data() } } };
    },

  async updateTeam(id, body) {
      await requireAdmin();
      const db = getDb();
      const ref = doc(db, 'teams', id);
      await updateDoc(ref, {
        ...body,
        updatedAt: serverTimestamp(),
      });
      const snap = await getDoc(ref);
      return { data: { team: { _id: id, id, ...snap.data() } } };
    },

  async deleteTeam(id) {
      await requireAdmin();
      const db = getDb();
      await deleteDoc(doc(db, 'teams', id));
      return { data: { message: 'Deleted' } };
    },

  getAvailablePermissions() {
      return Promise.resolve({ data: { permissions: AVAILABLE_PERMISSIONS } });
    },
};

async function listUsersHydrated() {
  const db = getDb();
  const teamsById = await loadTeamsById();
  const snap = await getDocs(collection(db, 'users'));
  const users = [];
  snap.forEach((d) => {
    const data = d.data();
    if (data.disabled) return;
    users.push(userDocToAppUser(data, d.id, teamsById));
  });
  return users;
}

async function userDocPublic(data, uid) {
  const teamsById = await loadTeamsById();
  return userDocToAppUser(data, uid, teamsById);
}

export const firebaseAdminApi = {
  async listUsers() {
      await requireAdmin();
      const users = await listUsersHydrated();
      return { data: { users } };
    },

  async createUser(body) {
      await requireAdmin();
      const email = body.email.trim().toLowerCase();
      const password = body.password;
      if (!password || password.length < 6) {
        throw apiError('Password must be at least 6 characters', 400);
      }
      let uid;
      try {
        uid = await authRestSignUp(email, password);
      } catch (e) {
        throw e;
      }
      const db = getDb();
      await setDoc(doc(db, 'users', uid), {
        email,
        firstName: body.firstName || '',
        lastName: body.lastName || '',
        roles: body.roles?.length ? body.roles : ['member'],
        teamIds: (body.teams || []).map((t) => (typeof t === 'string' ? t : t._id || t.id)),
        createdAt: serverTimestamp(),
      });
      const usnap = await getDoc(doc(db, 'users', uid));
      const user = await userDocPublic(usnap.data(), uid);
      return { data: { user } };
    },

  async updateUser(id, body) {
      await requireAdmin();
      const db = getDb();
      const ref = doc(db, 'users', id);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw apiError('User not found', 404);
      const authUser = getFirebaseAuth().currentUser;
      if (body.password && authUser && authUser.uid === id && body.password.length >= 6) {
        await updatePassword(authUser, body.password);
      }
      const patch = {
        firstName: body.firstName,
        lastName: body.lastName,
        roles: body.roles,
      };
      if (body.teams) {
        patch.teamIds = body.teams.map((t) => (typeof t === 'string' ? t : t._id || t.id));
      }
      if (body.email && body.email.trim().toLowerCase() !== snap.data().email) {
        patch.email = body.email.trim().toLowerCase();
      }
      Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);
      if (Object.keys(patch).length) {
        await updateDoc(ref, patch);
      }
      const next = await getDoc(ref);
      const user = await userDocPublic(next.data(), id);
      return { data: { user } };
    },

  async deleteUser(id) {
      await requireAdmin();
      const db = getDb();
      const ref = doc(db, 'users', id);
      await updateDoc(ref, { disabled: true, disabledAt: serverTimestamp() });
      return { data: { message: 'User disabled' } };
    },

  async updateUserRoles(id, roles) {
      return firebaseAdminApi.updateUser(id, { roles });
    },

  async updateUserTeams(id, teams) {
      return firebaseAdminApi.updateUser(id, { teams });
    },

  async updateUserPermissions(id, permissions) {
      await requireAdmin();
      const db = getDb();
      await updateDoc(doc(db, 'users', id), { directPermissions: permissions || [] });
      const snap = await getDoc(doc(db, 'users', id));
      const user = await userDocPublic(snap.data(), id);
      return { data: { user } };
    },

  async getAllTasks(params = {}) {
      await requireAdmin();
      const db = getDb();
      const snap = await getDocs(
        query(collection(db, 'tasks'), where('isArchived', '==', false))
      );
      let docs = [];
      snap.forEach((d) => docs.push({ id: d.id, data: d.data() }));
      const page = Math.max(1, parseInt(params.page, 10) || 1);
      const pageSize = Math.min(100, parseInt(params.limit, 10) || 20);
      if (params.status) docs = docs.filter(({ data }) => data.status === params.status);
      if (params.priority) docs = docs.filter(({ data }) => data.priority === params.priority);
      const search = (params.search || '').trim().toLowerCase();
      if (search) {
        docs = docs.filter(({ data }) => {
          const t = (data.title || '').toLowerCase();
          const desc = (data.description || '').toLowerCase();
          return t.includes(search) || desc.includes(search);
        });
      }
      const sortBy = params.sortBy || 'createdAt';
      const sortMult = params.sortOrder === 'asc' ? 1 : -1;
      docs.sort((a, b) => {
        const av = a.data[sortBy]?.toMillis?.() ?? a.data[sortBy];
        const bv = b.data[sortBy]?.toMillis?.() ?? b.data[sortBy];
        if (av < bv) return -1 * sortMult;
        if (av > bv) return 1 * sortMult;
        return 0;
      });
      const total = docs.length;
      const pages = Math.max(1, Math.ceil(total / pageSize));
      const slice = docs.slice((page - 1) * pageSize, page * pageSize);
      const tasks = await Promise.all(
        slice.map(({ id, data }) => hydrateTaskDoc(id, data))
      );
      return {
        data: {
          tasks,
          pagination: { current: page, pages, total },
        },
      };
    },

  async getTaskStats() {
      await requireAdmin();
      const db = getDb();
      const snap = await getDocs(
        query(collection(db, 'tasks'), where('isArchived', '==', false))
      );
      let pending = 0;
      let inProgress = 0;
      let completed = 0;
      snap.forEach((d) => {
        const s = d.data().status;
        if (s === 'pending') pending += 1;
        else if (s === 'in-progress') inProgress += 1;
        else if (s === 'completed') completed += 1;
      });
      return {
        data: {
          overview: {
            total: snap.size,
            pending,
            inProgress,
            completed,
          },
        },
      };
    },

  async assignTask(taskId, userId) {
      await requireAdmin();
      const db = getDb();
      const tref = doc(db, 'tasks', taskId);
      const snap = await getDoc(tref);
      if (!snap.exists()) throw apiError('Task not found', 404);
      const existing = snap.data();
      await updateDoc(tref, {
        userId,
        assigneeIds: [userId],
        updatedAt: serverTimestamp(),
        history: [
          ...(existing.history || []),
          {
            action: 'admin_assign',
            actor: getFirebaseAuth().currentUser.uid,
            changes: { userId },
            timestamp: new Date().toISOString(),
          },
        ],
      });
      const next = await getDoc(tref);
      const task = await hydrateTaskDoc(taskId, next.data());
      return { data: { task } };
    },

  async updateTask(taskId, taskData) {
      await requireAdmin();
      const db = getDb();
      const tref = doc(db, 'tasks', taskId);
      const snap = await getDoc(tref);
      if (!snap.exists()) throw apiError('Task not found', 404);
      const existing = snap.data();
      const fields = {};
      Object.keys(taskData || {}).forEach((k) => {
        if (taskData[k] !== undefined && k !== 'history') fields[k] = taskData[k];
      });
      await updateDoc(tref, {
        ...fields,
        updatedAt: serverTimestamp(),
        history: [
          ...(existing.history || []),
          {
            action: 'admin_update',
            actor: getFirebaseAuth().currentUser.uid,
            changes: taskData,
            timestamp: new Date().toISOString(),
          },
        ],
      });
      const next = await getDoc(tref);
      return { data: await hydrateTaskDoc(taskId, next.data()) };
    },
};
