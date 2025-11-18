import React, { useEffect, useMemo, useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { toast } from 'react-hot-toast';
import {
  Users,
  ShieldCheck,
  Crown,
  ClipboardList,
  Activity,
  Loader2,
  UserCog,
  Bell,
  Sliders,
  Database,
  Search,
  UserPlus,
  X,
  Edit,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI, teamsAPI } from '../services/api';

const PageWrapper = styled.div`
  min-height: calc(100vh - 80px);
  background: #f8fafc;
  padding: 0;
`;

const PageHeader = styled.header`
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 24px 32px;

  h1 {
    font-size: 28px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.5px;
    margin: 0 0 8px 0;
  }

  p {
    font-size: 14px;
    color: #64748b;
    margin: 0;
    line-height: 1.5;
  }
`;

const SettingsLayout = styled.div`
  display: flex;
  min-height: calc(100vh - 180px);
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 1024px) {
    flex-direction: column;
  }
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 36px;
`;

const Sidebar = styled.aside`
  width: 280px;
  background: white;
  border-right: 1px solid #e2e8f0;
  padding: 24px 0;
  flex-shrink: 0;

  @media (max-width: 1024px) {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }
`;

const SidebarSearch = styled.div`
  padding: 0 20px 20px 20px;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 16px;
`;

const SidebarSearchInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  color: #0f172a;
  background: #f8fafc;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const SidebarTabsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 12px;
`;

const SidebarTabButton = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  border: none;
  background: ${({ active }) => (active ? '#eff6ff' : 'transparent')};
  color: ${({ active }) => (active ? '#2563eb' : '#475569')};
  font-size: 14px;
  font-weight: ${({ active }) => (active ? '600' : '500')};
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  width: 100%;
  position: relative;

  &:hover {
    background: ${({ active }) => (active ? '#eff6ff' : '#f8fafc')};
    color: ${({ active }) => (active ? '#2563eb' : '#1e40af')};
  }

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: ${({ active }) => (active ? '24px' : '0')};
    background: #2563eb;
    border-radius: 0 3px 3px 0;
    transition: height 0.2s ease;
  }

  svg {
    flex-shrink: 0;
  }
`;

const ContentArea = styled.main`
  flex: 1;
  padding: 32px;
  overflow-y: auto;
  background: #f8fafc;

  @media (max-width: 1024px) {
    padding: 24px 16px;
  }
`;

const SearchResults = styled.div`
  display: ${({ visible }) => (visible ? 'flex' : 'none')};
  flex-direction: column;
  gap: 8px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 12px;
  margin-top: 8px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  max-height: 300px;
  overflow-y: auto;
`;

const SearchResultItem = styled.button`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  padding: 10px 12px;
  border-radius: 12px;
  transition: background 0.15s ease;

  &:hover {
    background: #f1f5f9;
  }

  h4 {
    margin: 0 0 4px 0;
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
  }

  p {
    margin: 0;
    font-size: 12px;
    color: #64748b;
    line-height: 1.5;
  }
`;

const SearchResultEmpty = styled.div`
  font-size: 12px;
  color: #94a3b8;
  padding: 6px 4px;
  font-weight: 600;
`;

const ComingSoonTag = styled.span`
  background: rgba(59, 130, 246, 0.18);
  color: #2563eb;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.6px;
  padding: 4px 8px;
  border-radius: 999px;
  text-transform: uppercase;
`;

const SummaryCard = styled.div`
  background: white;
  border-radius: 22px;
  padding: 24px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CardIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: ${({ bg }) => bg};
  color: ${({ color }) => color};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CardStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  span:first-child {
    font-size: 14px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  span:last-child {
    font-size: 30px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.8px;
  }
`;

const UsersSection = styled.section`
  background: white;
  border-radius: 24px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.05);
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const UsersHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  justify-content: space-between;

  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: #64748b;
    max-width: 520px;
    line-height: 1.5;
  }
`;

const UsersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const UserRow = styled.div`
  display: grid;
  grid-template-columns: minmax(200px, 2fr) minmax(250px, 3fr) auto;
  gap: 20px;
  background: white;
  border-radius: 12px;
  padding: 20px 24px;
  align-items: center;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  &:hover {
    border-color: #cbd5e1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const UserIdentity = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  strong {
    font-size: 16px;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.4;
  }

  span {
    font-size: 13px;
    color: #64748b;
    line-height: 1.4;
  }
`;

const RoleBadgeGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const RoleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ bg }) => bg};
  color: ${({ color }) => color};
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const RoleToggleGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const RoleToggle = styled.button`
  border: 1.5px solid ${({ active }) => (active ? '#2563eb' : '#dbeafe')};
  background: ${({ active }) => (active ? '#2563eb' : 'white')};
  color: ${({ active }) => (active ? 'white' : '#2563eb')};
  font-weight: 600;
  font-size: 12px;
  padding: 8px 14px;
  border-radius: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ active }) => (active ? '#1d4ed8' : '#eff6ff')};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const UpdateStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ success }) => (success ? '#059669' : '#94a3b8')};
`;

const UserSearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  padding: 12px 16px;
  max-width: 360px;

  input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 13px;
    color: #0f172a;

    &::placeholder {
      color: #94a3b8;
    }
  }
`;

const EmptyState = styled.div`
  padding: 48px;
  text-align: center;
  border-radius: 20px;
  border: 2px dashed #bfdbfe;
  color: #64748b;
  font-size: 14px;
  background: #f8fafc;
`;

const FilterEmptyState = styled.div`
  padding: 28px;
  text-align: center;
  border-radius: 18px;
  border: 1px dashed #dbeafe;
  color: #64748b;
  font-size: 13px;
  background: #f8fafc;
  font-weight: 500;
`;

const RestrictedState = styled.div`
  padding: 64px 32px;
  background: white;
  border-radius: 24px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.05);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;

  h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: #64748b;
    max-width: 460px;
    line-height: 1.6;
  }
`;

const PlaceholderCard = styled.div`
  background: white;
  border-radius: 24px;
  border: 1px dashed #dbeafe;
  padding: 48px 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  text-align: center;
  color: #475569;
  box-shadow: 0 12px 32px rgba(59, 130, 246, 0.08);

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #1e3a8a;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: #64748b;
    line-height: 1.6;
    max-width: 420px;
  }
`;

const LoadingWrapper = styled.div`
  padding: 32px 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #64748b;
  font-weight: 600;
`;

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const Spinner = styled(Loader2)`
  animation: ${spin} 0.8s linear infinite;
`;

const CreateUserButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 24px;
  padding: 32px;
  max-width: 520px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  h2 {
    font-size: 24px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
    letter-spacing: -0.4px;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
    color: #0f172a;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-weight: 600;
    color: #334155;
    font-size: 14px;
  }

  input,
  select {
    padding: 12px 16px;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    font-size: 14px;
    transition: all 0.2s ease;
    background: #fafbfc;
    color: #0f172a;
    font-family: inherit;

    &:focus {
      outline: none;
      border-color: #3b82f6;
      background: white;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
    }

    &::placeholder {
      color: #94a3b8;
    }
  }

  select {
    cursor: pointer;
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const RoleCheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 2px solid #e2e8f0;
`;

const RoleCheckbox = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.2s ease;

  &:hover {
    background: white;
  }

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #3b82f6;
  }

  span {
    font-size: 14px;
    font-weight: 500;
    color: #334155;
  }

  small {
    display: block;
    font-size: 12px;
    color: #64748b;
    margin-top: 2px;
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
  padding-top: 20px;
  border-top: 2px solid #f1f5f9;
`;

const ModalButton = styled.button`
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;

  &.primary {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
  }

  &.secondary {
    background: #f1f5f9;
    color: #334155;

    &:hover {
      background: #e2e8f0;
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const rolePalette = {
  admin: { bg: 'rgba(37, 99, 235, 0.12)', color: '#1d4ed8', icon: <Crown size={14} /> },
  manager: { bg: 'rgba(16, 185, 129, 0.14)', color: '#047857', icon: <ClipboardList size={14} /> },
  member: { bg: 'rgba(99, 102, 241, 0.1)', color: '#4338ca', icon: <Users size={14} /> },
};

const roleOptions = [
  {
    value: 'admin',
    label: 'Administrator',
    description: 'Full access to system settings and data.'
  },
  {
    value: 'manager',
    label: 'Manager',
    description: 'Can coordinate teams and manage high-priority work.'
  },
  {
    value: 'member',
    label: 'Member',
    description: 'Standard workspace access for task collaborators.'
  }
];

const SettingsPage = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('roles');
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [updatedRecently, setUpdatedRecently] = useState(null);
  const [userFilter, setUserFilter] = useState('');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isDeletingUser, setIsDeletingUser] = useState(null);
  const [newUserForm, setNewUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roles: ['member'],
    teams: [],
  });
  const [teams, setTeams] = useState([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [newTeamForm, setNewTeamForm] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    icon: 'users',
    permissions: [],
  });

  const tabs = useMemo(() => [
    {
      id: 'roles',
      label: 'Users & Roles',
      description: 'Manage users and assign roles to control workspace access.',
      icon: UserCog,
      keywords: ['users', 'roles', 'access', 'security', 'admin'],
    },
    {
      id: 'teams',
      label: 'Teams & Permissions',
      description: 'Create custom teams and configure granular permissions.',
      icon: ShieldCheck,
      keywords: ['teams', 'permissions', 'custom', 'groups', 'access control'],
    },
    {
      id: 'notifications',
      label: 'Notifications & Automations',
      description: 'Configure alerts, escalation paths, and automated workflows.',
      icon: Bell,
      keywords: ['notifications', 'alerts', 'automation', 'workflow', 'escalations'],
      comingSoon: true,
    },
    {
      id: 'integrations',
      label: 'Integrations & Data',
      description: 'Connect external tools and manage data sync policies.',
      icon: Database,
      keywords: ['integrations', 'api', 'data', 'sync', 'connectors'],
      comingSoon: true,
    },
    {
      id: 'workspace',
      label: 'Workspace Preferences',
      description: 'Branding, task templates, and collaboration defaults.',
      icon: Sliders,
      keywords: ['workspace', 'preferences', 'branding', 'templates', 'defaults'],
      comingSoon: true,
    },
  ], []);

  const canManageRoles = user?.roles?.includes('admin');
  const activeTabDefinition = useMemo(
    () => tabs.find(tab => tab.id === activeTab) || tabs[0],
    [tabs, activeTab]
  );

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const searchMatches = useMemo(() => {
    if (!normalizedSearchTerm) return [];
    return tabs.filter(tab => {
      const haystack = [
        tab.label,
        tab.description,
        ...(tab.keywords || []),
      ]
        .filter(Boolean)
        .map(value => value.toLowerCase());
      return haystack.some(value => value.includes(normalizedSearchTerm));
    });
  }, [normalizedSearchTerm, tabs]);

  const highlightTab = useCallback(
    (tabId) => normalizedSearchTerm.length > 0 && searchMatches.some(match => match.id === tabId),
    [normalizedSearchTerm, searchMatches]
  );

  useEffect(() => {
    if (!canManageRoles) return;

    const fetchData = async () => {
      if (activeTab === 'roles') {
        setIsLoadingUsers(true);
        try {
          const response = await adminAPI.listUsers();
          setUsers(response.data.users || []);
        } catch (error) {
          console.error('Failed to load users:', error);
          toast.error(error.response?.data?.message || 'Unable to load users.');
        } finally {
          setIsLoadingUsers(false);
        }
      } else if (activeTab === 'teams') {
        setIsLoadingTeams(true);
        try {
          const [teamsResponse, permissionsResponse] = await Promise.all([
            teamsAPI.listTeams(),
            teamsAPI.getAvailablePermissions(),
          ]);
          setTeams(teamsResponse.data.teams || []);
          setAvailablePermissions(permissionsResponse.data.permissions || []);
        } catch (error) {
          console.error('Failed to load teams:', error);
          toast.error(error.response?.data?.message || 'Unable to load teams.');
        } finally {
          setIsLoadingTeams(false);
        }
      }
    };

    fetchData();
  }, [canManageRoles, activeTab]);

  const roleStats = useMemo(() => ({
    total: users.length,
    admins: users.filter(u => u.roles?.includes('admin')).length,
    managers: users.filter(u => u.roles?.includes('manager')).length,
  }), [users]);

  const filteredUsers = useMemo(() => {
    if (!userFilter.trim()) return users;
    const term = userFilter.trim().toLowerCase();
    return users.filter(account => {
      const values = [
        account.fullName,
        `${account.firstName || ''} ${account.lastName || ''}`,
        account.firstName,
        account.lastName,
        account.email,
        ...(account.roles || []),
      ];
      return values
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(term));
    });
  }, [users, userFilter]);

  const handleToggleRole = async (targetUser, role) => {
    if (updatingUserId) return;

    const hasRole = targetUser.roles?.includes(role);
    const nextRoles = hasRole
      ? targetUser.roles.filter(r => r !== role)
      : [...(targetUser.roles || []), role];

    if (!nextRoles.length) {
      toast.error('Each user must have at least one role.');
      return;
    }

    const previousUsers = [...users];

    setUsers(prev =>
      prev.map(u =>
        u._id === targetUser._id ? { ...u, roles: nextRoles } : u
      )
    );
    setUpdatingUserId(targetUser._id);

    try {
      const response = await adminAPI.updateUserRoles(targetUser._id, nextRoles);
      const updatedUser = response.data.user;
      setUsers(prev =>
        prev.map(u =>
          u._id === updatedUser._id ? updatedUser : u
        )
      );
      setUpdatedRecently(targetUser._id);
      setTimeout(() => setUpdatedRecently(null), 2000);
      toast.success(`Updated roles for ${updatedUser.fullName || updatedUser.email}`);
    } catch (error) {
      console.error('Role update failed:', error);
      const message = error.response?.data?.message || 'Unable to update roles.';
      toast.error(message);
      setUsers(previousUsers);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleSearchResultSelect = (tabId) => {
    setActiveTab(tabId);
    setSearchTerm('');
    if (tabId === 'roles') {
      setUserFilter('');
    }
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter' && searchMatches.length) {
      event.preventDefault();
      handleSearchResultSelect(searchMatches[0].id);
    }
  };

  const handleTabSelection = (tabId) => {
    setActiveTab(tabId);
    setSearchTerm('');
    if (tabId === 'roles') {
      setUserFilter('');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserForm.firstName.trim() || !newUserForm.lastName.trim() || !newUserForm.email.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    // Password is required only for new users
    if (!editingUser && (!newUserForm.password.trim() || newUserForm.password.length < 6)) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    // If editing and password is provided, validate it
    if (editingUser && newUserForm.password.trim() && newUserForm.password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    if (newUserForm.roles.length === 0) {
      toast.error('Please select at least one role.');
      return;
    }

    setIsCreatingUser(true);
    try {
      if (editingUser) {
        // Update existing user
        const updateData = {
          firstName: newUserForm.firstName.trim(),
          lastName: newUserForm.lastName.trim(),
          email: newUserForm.email.trim().toLowerCase(),
          roles: newUserForm.roles,
          teams: newUserForm.teams,
        };
        
        // Only include password if it's been changed
        if (newUserForm.password.trim()) {
          updateData.password = newUserForm.password;
        }

        const response = await adminAPI.updateUser(editingUser._id, updateData);
        const updatedUser = response.data.user;
        setUsers(prev => prev.map(u => u._id === updatedUser._id ? updatedUser : u));
        toast.success(`User ${updatedUser.fullName || updatedUser.email} updated successfully!`);
      } else {
        // Create new user
        const response = await adminAPI.createUser({
          firstName: newUserForm.firstName.trim(),
          lastName: newUserForm.lastName.trim(),
          email: newUserForm.email.trim().toLowerCase(),
          password: newUserForm.password,
          roles: newUserForm.roles,
          teams: newUserForm.teams,
        });

        const newUser = response.data.user;
        setUsers(prev => [...prev, newUser]);
        toast.success(`User ${newUser.fullName || newUser.email} created successfully!`);
      }
      
      setShowCreateUserModal(false);
      setEditingUser(null);
      setNewUserForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        roles: ['member'],
        teams: [],
      });
    } catch (error) {
      console.error('User operation failed:', error);
      const message = error.response?.data?.message || `Unable to ${editingUser ? 'update' : 'create'} user.`;
      toast.error(message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleEditUser = async (user) => {
    // Load teams if not already loaded
    if (teams.length === 0) {
      try {
        const response = await teamsAPI.listTeams();
        setTeams(response.data.teams || []);
      } catch (error) {
        console.error('Failed to load teams:', error);
      }
    }
    
    setEditingUser(user);
    setNewUserForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      password: '', // Don't pre-fill password
      roles: user.roles || ['member'],
      teams: user.teams ? user.teams.map(t => t._id || t) : [],
    });
    setShowCreateUserModal(true);
  };

  const handleDeleteUser = async (userId) => {
    const user = users.find(u => u._id === userId);
    if (!user) return;

    const displayName = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;
    
    if (!window.confirm(`Are you sure you want to delete user "${displayName}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeletingUser(userId);
    try {
      await adminAPI.deleteUser(userId);
      setUsers(prev => prev.filter(u => u._id !== userId));
      toast.success(`User "${displayName}" deleted successfully!`);
    } catch (error) {
      console.error('Delete user failed:', error);
      const message = error.response?.data?.message || 'Unable to delete user.';
      toast.error(message);
    } finally {
      setIsDeletingUser(null);
    }
  };

  const handleRoleToggle = (role) => {
    setNewUserForm(prev => {
      const hasRole = prev.roles.includes(role);
      if (hasRole && prev.roles.length === 1) {
        toast.error('At least one role must be selected.');
        return prev;
      }
      return {
        ...prev,
        roles: hasRole
          ? prev.roles.filter(r => r !== role)
          : [...prev.roles, role],
      };
    });
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamForm.name.trim()) {
      toast.error('Team name is required.');
      return;
    }

    setIsCreatingUser(true);
    try {
      const response = editingTeam
        ? await teamsAPI.updateTeam(editingTeam._id, newTeamForm)
        : await teamsAPI.createTeam(newTeamForm);

      const team = response.data.team;
      if (editingTeam) {
        setTeams(prev => prev.map(t => t._id === team._id ? team : t));
        toast.success(`Team "${team.name}" updated successfully!`);
      } else {
        setTeams(prev => [...prev, team]);
        toast.success(`Team "${team.name}" created successfully!`);
      }
      setShowCreateTeamModal(false);
      setEditingTeam(null);
      setNewTeamForm({
        name: '',
        description: '',
        color: '#3b82f6',
        icon: 'users',
        permissions: [],
      });
    } catch (error) {
      console.error('Team operation failed:', error);
      const message = error.response?.data?.message || 'Unable to save team.';
      toast.error(message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to delete this team? Users assigned to this team will be removed from it.')) {
      return;
    }

    try {
      await teamsAPI.deleteTeam(teamId);
      setTeams(prev => prev.filter(t => t._id !== teamId));
      toast.success('Team deleted successfully!');
    } catch (error) {
      console.error('Team deletion failed:', error);
      const message = error.response?.data?.message || 'Unable to delete team.';
      toast.error(message);
    }
  };

  const handleEditTeam = (team) => {
    setEditingTeam(team);
    setNewTeamForm({
      name: team.name,
      description: team.description || '',
      color: team.color || '#3b82f6',
      icon: team.icon || 'users',
      permissions: team.permissions || [],
    });
    setShowCreateTeamModal(true);
  };

  const handlePermissionToggle = (permission) => {
    setNewTeamForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  if (!canManageRoles) {
    return (
      <PageWrapper>
        <RestrictedState>
          <ShieldCheck size={42} color="#2563eb" />
          <h2>Restricted Access</h2>
          <p>
            You need administrator permissions to manage roles and permissions. Contact an administrator if you believe
            this is an error.
          </p>
        </RestrictedState>
      </PageWrapper>
    );
  }

  const PlaceholderIcon = activeTabDefinition?.icon || ShieldCheck;

  return (
    <PageWrapper>
      <PageHeader>
        <h1>Settings</h1>
        <p>Manage your workspace, users, teams, and permissions</p>
      </PageHeader>

      <SettingsLayout>
        <Sidebar>
          <SidebarSearch>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <SidebarSearchInput
                value={searchTerm}
                placeholder="Search settings..."
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                style={{ paddingLeft: '40px' }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '4px 8px',
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            <SearchResults visible={Boolean(searchTerm)}>
              {searchMatches.length ? (
                searchMatches.map(match => {
                  const Icon = match.icon;
                  return (
                    <SearchResultItem
                      key={match.id}
                      type="button"
                      onClick={() => handleSearchResultSelect(match.id)}
                    >
                      <Icon size={16} color="#2563eb" style={{ marginTop: 2 }} />
                      <div>
                        <h4>{match.label}</h4>
                        <p>{match.description}</p>
                      </div>
                    </SearchResultItem>
                  );
                })
              ) : searchTerm ? (
                <div style={{ padding: '12px', color: '#64748b', fontSize: '13px', textAlign: 'center' }}>
                  No settings matched "{searchTerm}"
                </div>
              ) : null}
            </SearchResults>
          </SidebarSearch>

          <SidebarTabsList>
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <SidebarTabButton
                  key={tab.id}
                  type="button"
                  active={activeTab === tab.id}
                  onClick={() => handleTabSelection(tab.id)}
                  disabled={tab.comingSoon}
                >
                  <Icon size={18} />
                  <span style={{ flex: 1 }}>{tab.label}</span>
                  {tab.comingSoon && (
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                      Soon
                    </span>
                  )}
                </SidebarTabButton>
              );
            })}
          </SidebarTabsList>
        </Sidebar>

        <ContentArea>
          {activeTab === 'roles' ? (
          <>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
                Users & Roles
              </h2>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                Manage users and assign roles to control workspace access
              </p>
            </div>
            <SummaryGrid>
              <SummaryCard>
                <CardIcon bg="rgba(37, 99, 235, 0.12)" color="#1d4ed8">
                  <ShieldCheck size={20} />
                </CardIcon>
                <CardStat>
                  <span>Total Members</span>
                  <span>{roleStats.total}</span>
                </CardStat>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                  Active collaborators with access to your task workspace.
                </p>
              </SummaryCard>
              <SummaryCard>
                <CardIcon bg="rgba(59, 130, 246, 0.12)" color="#2563eb">
                  <Crown size={20} />
                </CardIcon>
                <CardStat>
                  <span>Administrators</span>
                  <span>{roleStats.admins}</span>
                </CardStat>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                  System-level guardians with full control over policies and data.
                </p>
              </SummaryCard>
              <SummaryCard>
                <CardIcon bg="rgba(16, 185, 129, 0.14)" color="#047857">
                  <ClipboardList size={20} />
                </CardIcon>
                <CardStat>
                  <span>Managers</span>
                  <span>{roleStats.managers}</span>
                </CardStat>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                  Team coordinators who fast-track work and approvals.
                </p>
              </SummaryCard>
            </SummaryGrid>

            <UsersSection>
              <UsersHeader>
                <div>
                  <h2>
                    <UserCog size={20} />
                    User Directory
                  </h2>
                  <p>Assign or adjust workspace roles for every collaborator in a single view.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <UserSearchBar>
                    <Search size={16} color="#2563eb" />
                    <input
                      value={userFilter}
                      onChange={(event) => setUserFilter(event.target.value)}
                      placeholder="Search by name, email, or role…"
                    />
                  </UserSearchBar>
                  <CreateUserButton onClick={async () => {
                    // Load teams if not already loaded
                    if (teams.length === 0) {
                      try {
                        const response = await teamsAPI.listTeams();
                        setTeams(response.data.teams || []);
                      } catch (error) {
                        console.error('Failed to load teams:', error);
                      }
                    }
                    setShowCreateUserModal(true);
                  }}>
                    <UserPlus size={16} />
                    Add User
                  </CreateUserButton>
                </div>
              </UsersHeader>

              {isLoadingUsers ? (
                <LoadingWrapper>
                  <Spinner size={18} />
                  Fetching user directory...
                </LoadingWrapper>
              ) : users.length === 0 ? (
                <EmptyState>No members found yet. Invite teammates to collaborate on tasks.</EmptyState>
              ) : (
                <>
                  <UsersList>
                    {filteredUsers.map(account => {
                      const displayName =
                        account.fullName ||
                        [account.firstName, account.lastName].filter(Boolean).join(' ').trim();

                      return (
                        <UserRow key={account._id}>
                          <UserIdentity>
                            <strong>{displayName || account.email}</strong>
                            <span>{account.email}</span>
                          </UserIdentity>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <RoleBadgeGroup>
                              {(account.roles || ['member']).map(role => {
                                const palette = rolePalette[role] || rolePalette.member;
                                return (
                                  <RoleBadge key={role} bg={palette.bg} color={palette.color}>
                                    {palette.icon}
                                    {role}
                                  </RoleBadge>
                                );
                              })}
                              {account.teams && account.teams.length > 0 && account.teams.map(team => (
                                <RoleBadge
                                  key={team._id || team}
                                  bg={team.color ? `${team.color}20` : 'rgba(59, 130, 246, 0.1)'}
                                  color={team.color || '#2563eb'}
                                >
                                  {typeof team === 'object' ? team.name : 'Team'}
                                </RoleBadge>
                              ))}
                            </RoleBadgeGroup>
                            {updatingUserId === account._id && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                                <Spinner size={12} />
                                <span>Updating...</span>
                              </div>
                            )}
                            {updatedRecently === account._id && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10b981' }}>
                                <Activity size={12} />
                                <span>Updated successfully</span>
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => handleEditUser(account)}
                              disabled={isDeletingUser === account._id || updatingUserId === account._id}
                              style={{
                                padding: '10px 16px',
                                border: '1.5px solid #e2e8f0',
                                borderRadius: '8px',
                                background: 'white',
                                color: '#475569',
                                cursor: isDeletingUser === account._id || updatingUserId === account._id ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '13px',
                                fontWeight: 600,
                                transition: 'all 0.15s ease',
                                opacity: isDeletingUser === account._id || updatingUserId === account._id ? 0.5 : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (isDeletingUser !== account._id && updatingUserId !== account._id) {
                                  e.currentTarget.style.borderColor = '#3b82f6';
                                  e.currentTarget.style.color = '#2563eb';
                                  e.currentTarget.style.background = '#eff6ff';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (isDeletingUser !== account._id && updatingUserId !== account._id) {
                                  e.currentTarget.style.borderColor = '#e2e8f0';
                                  e.currentTarget.style.color = '#475569';
                                  e.currentTarget.style.background = 'white';
                                }
                              }}
                            >
                              <Edit size={16} />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(account._id)}
                              disabled={isDeletingUser === account._id || updatingUserId === account._id}
                              style={{
                                padding: '10px 16px',
                                border: '1.5px solid #fee2e2',
                                borderRadius: '8px',
                                background: isDeletingUser === account._id ? '#fecaca' : 'white',
                                color: isDeletingUser === account._id ? '#991b1b' : '#dc2626',
                                cursor: isDeletingUser === account._id || updatingUserId === account._id ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '13px',
                                fontWeight: 600,
                                transition: 'all 0.15s ease',
                                opacity: isDeletingUser === account._id || updatingUserId === account._id ? 0.6 : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (isDeletingUser !== account._id && updatingUserId !== account._id) {
                                  e.currentTarget.style.borderColor = '#fecaca';
                                  e.currentTarget.style.background = '#fee2e2';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (isDeletingUser !== account._id && updatingUserId !== account._id) {
                                  e.currentTarget.style.borderColor = '#fee2e2';
                                  e.currentTarget.style.background = 'white';
                                }
                              }}
                            >
                              {isDeletingUser === account._id ? (
                                <>
                                  <Spinner size={16} />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 size={16} />
                                  Delete
                                </>
                              )}
                            </button>
                          </div>
                        </UserRow>
                      );
                    })}
                  </UsersList>

                  {filteredUsers.length === 0 && users.length > 0 && (
                    <FilterEmptyState>
                      No team members matched “{userFilter}”.
                    </FilterEmptyState>
                  )}
                </>
              )}
            </UsersSection>
          </>
        ) : activeTab === 'teams' ? (
          <>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
                Teams & Permissions
              </h2>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                Create custom teams and configure granular permissions for each team
              </p>
            </div>
            <UsersSection>
              <UsersHeader>
                <div>
                  <h2>
                    <ShieldCheck size={20} />
                    Teams Directory
                  </h2>
                  <p>Manage your teams and their permissions</p>
                </div>
              <CreateUserButton onClick={() => {
                setEditingTeam(null);
                setNewTeamForm({
                  name: '',
                  description: '',
                  color: '#3b82f6',
                  icon: 'users',
                  permissions: [],
                });
                setShowCreateTeamModal(true);
              }}>
                <UserPlus size={16} />
                Create Team
              </CreateUserButton>
              </UsersHeader>

            {isLoadingTeams ? (
              <LoadingWrapper>
                <Spinner size={18} />
                Loading teams...
              </LoadingWrapper>
            ) : teams.length === 0 ? (
              <EmptyState>No teams found. Create your first team to get started.</EmptyState>
            ) : (
              <UsersList>
                {teams.map(team => (
                  <UserRow key={team._id}>
                    <UserIdentity>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: team.color || '#3b82f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '16px',
                          }}
                        >
                          {team.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong>{team.name}</strong>
                          {team.isSystem && (
                            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px', fontWeight: 600 }}>
                              SYSTEM
                            </span>
                          )}
                          {team.description && (
                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                              {team.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </UserIdentity>
                    <RoleBadgeGroup>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                          Permissions ({team.permissions?.length || 0})
                        </div>
                        {team.permissions && team.permissions.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {team.permissions.slice(0, 5).map(perm => (
                              <RoleBadge key={perm} bg="rgba(59, 130, 246, 0.1)" color="#2563eb" style={{ fontSize: '11px' }}>
                                {perm.replace('.', ' ')}
                              </RoleBadge>
                            ))}
                            {team.permissions.length > 5 && (
                              <RoleBadge bg="rgba(100, 116, 139, 0.1)" color="#64748b" style={{ fontSize: '11px' }}>
                                +{team.permissions.length - 5} more
                              </RoleBadge>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>No permissions assigned</span>
                        )}
                      </div>
                    </RoleBadgeGroup>
                    <RoleToggleGroup>
                      <RoleToggle
                        type="button"
                        active={false}
                        onClick={() => handleEditTeam(team)}
                        style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#2563eb' }}
                      >
                        ✏️ Edit
                      </RoleToggle>
                      {!team.isSystem && (
                        <RoleToggle
                          type="button"
                          active={false}
                          onClick={() => handleDeleteTeam(team._id)}
                          style={{ background: '#fee2e2', borderColor: '#fecaca', color: '#dc2626' }}
                        >
                          🗑️ Delete
                        </RoleToggle>
                      )}
                    </RoleToggleGroup>
                    <UpdateStatus success={false}>
                      <ShieldCheck size={14} />
                      {team.isSystem ? 'System' : 'Custom'}
                    </UpdateStatus>
                  </UserRow>
                ))}
              </UsersList>
            )}
            </UsersSection>
          </>
        ) : (
          <PlaceholderCard>
            <PlaceholderIcon size={36} color="#2563eb" />
            <h3>{activeTabDefinition.label}</h3>
            <p>{activeTabDefinition.description}</p>
            <ComingSoonTag>In roadmap</ComingSoonTag>
          </PlaceholderCard>
        )}
        </ContentArea>
      </SettingsLayout>

      {showCreateUserModal && (
        <ModalOverlay onClick={() => !isCreatingUser && setShowCreateUserModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h2>{editingUser ? 'Edit User' : 'Create New User'}</h2>
              <CloseButton onClick={() => {
                if (!isCreatingUser) {
                  setShowCreateUserModal(false);
                  setEditingUser(null);
                  setNewUserForm({
                    firstName: '',
                    lastName: '',
                    email: '',
                    password: '',
                    roles: ['member'],
                    teams: [],
                  });
                }
              }} disabled={isCreatingUser}>
                <X size={20} />
              </CloseButton>
            </ModalHeader>
            <Form onSubmit={handleCreateUser}>
              <FormRow>
                <FormGroup>
                  <label htmlFor="firstName">First Name *</label>
                  <input
                    id="firstName"
                    type="text"
                    value={newUserForm.firstName}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="John"
                    required
                    disabled={isCreatingUser}
                  />
                </FormGroup>
                <FormGroup>
                  <label htmlFor="lastName">Last Name *</label>
                  <input
                    id="lastName"
                    type="text"
                    value={newUserForm.lastName}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Doe"
                    required
                    disabled={isCreatingUser}
                  />
                </FormGroup>
              </FormRow>
              <FormGroup>
                <label htmlFor="email">Email *</label>
                <input
                  id="email"
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john.doe@example.com"
                  required
                  disabled={isCreatingUser}
                />
              </FormGroup>
              <FormGroup>
                <label htmlFor="password">Password {editingUser ? '(leave blank to keep current)' : '*'}</label>
                <input
                  id="password"
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={editingUser ? "Leave blank to keep current password" : "Minimum 6 characters"}
                  required={!editingUser}
                  minLength={editingUser ? 0 : 6}
                  disabled={isCreatingUser}
                />
              </FormGroup>
              <FormGroup>
                <label>Roles *</label>
                <RoleCheckboxGroup>
                  {roleOptions.map(option => (
                    <RoleCheckbox key={option.value}>
                      <input
                        type="checkbox"
                        checked={newUserForm.roles.includes(option.value)}
                        onChange={() => handleRoleToggle(option.value)}
                        disabled={isCreatingUser}
                      />
                      <div>
                        <span>{option.label}</span>
                        <small>{option.description}</small>
                      </div>
                    </RoleCheckbox>
                  ))}
                </RoleCheckboxGroup>
              </FormGroup>
              <FormGroup>
                <label>Teams</label>
                <RoleCheckboxGroup>
                  {teams.length > 0 ? (
                    teams.map(team => (
                      <RoleCheckbox key={team._id}>
                        <input
                          type="checkbox"
                          checked={newUserForm.teams.includes(team._id)}
                          onChange={() => {
                            setNewUserForm(prev => ({
                              ...prev,
                              teams: prev.teams.includes(team._id)
                                ? prev.teams.filter(t => t !== team._id)
                                : [...prev.teams, team._id],
                            }));
                          }}
                          disabled={isCreatingUser}
                        />
                        <div>
                          <span>{team.name}</span>
                          <small>{team.description || 'No description'}</small>
                        </div>
                      </RoleCheckbox>
                    ))
                  ) : (
                    <div style={{ padding: '12px', color: '#64748b', fontSize: '13px' }}>
                      No teams available. Create teams in the Teams & Permissions tab.
                    </div>
                  )}
                </RoleCheckboxGroup>
              </FormGroup>
              <ModalActions>
                <ModalButton
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setShowCreateUserModal(false);
                    setEditingUser(null);
                    setNewUserForm({
                      firstName: '',
                      lastName: '',
                      email: '',
                      password: '',
                      roles: ['member'],
                      teams: [],
                    });
                  }}
                  disabled={isCreatingUser}
                >
                  Cancel
                </ModalButton>
                <ModalButton
                  type="submit"
                  className="primary"
                  disabled={isCreatingUser}
                >
                  {isCreatingUser ? (
                    <>
                      <Spinner size={14} style={{ display: 'inline-block', marginRight: '8px' }} />
                      {editingUser ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingUser ? 'Update User' : 'Create User'
                  )}
                </ModalButton>
              </ModalActions>
            </Form>
          </ModalContent>
        </ModalOverlay>
      )}

      {showCreateTeamModal && (
        <ModalOverlay onClick={() => !isCreatingUser && setShowCreateTeamModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <ModalHeader>
              <h2>{editingTeam ? 'Edit Team' : 'Create New Team'}</h2>
              <CloseButton onClick={() => !isCreatingUser && setShowCreateTeamModal(false)} disabled={isCreatingUser}>
                <X size={20} />
              </CloseButton>
            </ModalHeader>
            <Form onSubmit={handleCreateTeam}>
              <FormGroup>
                <label htmlFor="teamName">Team Name *</label>
                <input
                  id="teamName"
                  type="text"
                  value={newTeamForm.name}
                  onChange={(e) => setNewTeamForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Development Team"
                  required
                  disabled={isCreatingUser || (editingTeam?.isSystem)}
                />
              </FormGroup>
              <FormGroup>
                <label htmlFor="teamDescription">Description</label>
                <input
                  id="teamDescription"
                  type="text"
                  value={newTeamForm.description}
                  onChange={(e) => setNewTeamForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the team's purpose"
                  disabled={isCreatingUser}
                />
              </FormGroup>
              <FormRow>
                <FormGroup>
                  <label htmlFor="teamColor">Color</label>
                  <input
                    id="teamColor"
                    type="color"
                    value={newTeamForm.color}
                    onChange={(e) => setNewTeamForm(prev => ({ ...prev, color: e.target.value }))}
                    disabled={isCreatingUser}
                    style={{ height: '48px', cursor: 'pointer' }}
                  />
                </FormGroup>
                <FormGroup>
                  <label htmlFor="teamIcon">Icon</label>
                  <input
                    id="teamIcon"
                    type="text"
                    value={newTeamForm.icon}
                    onChange={(e) => setNewTeamForm(prev => ({ ...prev, icon: e.target.value }))}
                    placeholder="users"
                    disabled={isCreatingUser}
                  />
                </FormGroup>
              </FormRow>
              <FormGroup>
                <label>Permissions</label>
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '2px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#f8fafc' }}>
                  {availablePermissions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {availablePermissions.map(permission => {
                        const [category, action] = permission.split('.');
                        return (
                          <RoleCheckbox key={permission}>
                            <input
                              type="checkbox"
                              checked={newTeamForm.permissions.includes(permission)}
                              onChange={() => handlePermissionToggle(permission)}
                              disabled={isCreatingUser}
                            />
                            <div>
                              <span style={{ textTransform: 'capitalize' }}>{action || permission}</span>
                              <small style={{ display: 'block', marginTop: '2px' }}>
                                {category} • {permission}
                              </small>
                            </div>
                          </RoleCheckbox>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                      Loading permissions...
                    </div>
                  )}
                </div>
              </FormGroup>
              <ModalActions>
                <ModalButton
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setShowCreateTeamModal(false);
                    setEditingTeam(null);
                    setNewTeamForm({
                      name: '',
                      description: '',
                      color: '#3b82f6',
                      icon: 'users',
                      permissions: [],
                    });
                  }}
                  disabled={isCreatingUser}
                >
                  Cancel
                </ModalButton>
                <ModalButton
                  type="submit"
                  className="primary"
                  disabled={isCreatingUser}
                >
                  {isCreatingUser ? (
                    <>
                      <Spinner size={14} style={{ display: 'inline-block', marginRight: '8px' }} />
                      {editingTeam ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingTeam ? 'Update Team' : 'Create Team'
                  )}
                </ModalButton>
              </ModalActions>
            </Form>
          </ModalContent>
        </ModalOverlay>
      )}
    </PageWrapper>
  );
};

export default SettingsPage;

