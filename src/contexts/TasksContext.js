import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';
import { getDb } from '../firebase/app';
import { tasksAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';

const TasksContext = createContext();

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
};

function mapDocToTask(id, data, userById) {
  const hydrateUser = (uid) => {
    if (!uid) return null;
    const u = userById[uid];
    return u || { _id: uid, id: uid };
  };
  const assigneeIds = data.assigneeIds || [];
  const assignees = assigneeIds.map((x) => hydrateUser(x));
  const ownerId = data.userId;
  return {
    _id: id,
    id,
    title: data.title,
    description: data.description || '',
    status: data.status || 'pending',
    priority: data.priority || 'medium',
    dueDate: data.dueDate,
    isArchived: !!data.isArchived,
    user: hydrateUser(ownerId),
    assignees: assignees.length ? assignees : ownerId ? [hydrateUser(ownerId)] : [],
  };
}

async function buildUserLookup(docs) {
  const ids = new Set();
  docs.forEach(({ data }) => {
    (data.assigneeIds || []).forEach((x) => ids.add(x));
    if (data.userId) ids.add(data.userId);
  });
  const db = getDb();
  /** @type {Record<string, object>} */
  const userById = {};
  await Promise.all(
    [...ids].map(async (uid) => {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) {
        userById[uid] = { _id: uid, id: uid, email: '', firstName: '', lastName: '' };
        return;
      }
      const d = snap.data();
      userById[uid] = {
        _id: uid,
        id: uid,
        email: d.email || '',
        firstName: d.firstName || '',
        lastName: d.lastName || '',
        fullName: `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.email || '',
      };
    })
  );
  return userById;
}

export const TasksProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const q1Ref = useRef(new Map());
  const q2Ref = useRef(new Map());
  const hydrateSeq = useRef(0);
  const uid = user?._id || user?.id;

  const applyMergedTasks = useCallback(async () => {
    const m = new Map();
    q1Ref.current.forEach((v, k) => m.set(k, v));
    q2Ref.current.forEach((v, k) => m.set(k, v));
    const docs = [...m.values()];
    const seq = ++hydrateSeq.current;
    const userById = await buildUserLookup(docs);
    if (seq !== hydrateSeq.current) return;
    setTasks(docs.map((row) => mapDocToTask(row.id, row.data, userById)));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !uid) {
      setTasks([]);
      setIsLoading(false);
      q1Ref.current = new Map();
      q2Ref.current = new Map();
      return undefined;
    }

    setIsLoading(true);
    q1Ref.current = new Map();
    q2Ref.current = new Map();

    const db = getDb();
    const col = collection(db, 'tasks');
    const q1 = query(
      col,
      where('assigneeIds', 'array-contains', uid),
      where('isArchived', '==', false)
    );
    const q2 = query(col, where('userId', '==', uid), where('isArchived', '==', false));

    const unsub1 = onSnapshot(
      q1,
      (snap) => {
        const map = new Map();
        snap.docs.forEach((d) => map.set(d.id, { id: d.id, data: d.data() }));
        q1Ref.current = map;
        applyMergedTasks().finally(() => setIsLoading(false));
      },
      (err) => {
        console.error('Tasks subscription error:', err);
        toast.error('Failed to sync tasks');
        setIsLoading(false);
      }
    );

    const unsub2 = onSnapshot(
      q2,
      (snap) => {
        const map = new Map();
        snap.docs.forEach((d) => map.set(d.id, { id: d.id, data: d.data() }));
        q2Ref.current = map;
        applyMergedTasks().finally(() => setIsLoading(false));
      },
      (err) => {
        console.error('Tasks subscription error:', err);
        toast.error('Failed to sync tasks');
        setIsLoading(false);
      }
    );

    return () => {
      unsub1();
      unsub2();
    };
  }, [isAuthenticated, uid, applyMergedTasks]);

  const refreshTasks = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoading(true);
      const response = await tasksAPI.getTasks({ limit: 500 });
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Failed to refresh tasks:', error);
      toast.error('Failed to refresh tasks');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setTasks([]);
    }
  }, [isAuthenticated]);

  const value = {
    tasks,
    setTasks,
    isLoading,
    refreshTasks,
    socket: null,
  };

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
};
