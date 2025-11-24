import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { toast } from 'react-hot-toast';
import {
  LayoutDashboard,
  Search,
  Filter,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowUpDown,
  UserPlus,
  Edit,
  Loader2,
  TrendingUp,
  Users,
  FileText,
  Eye,
  Tag,
} from 'lucide-react';
import { adminAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const DashboardContainer = styled.div`
  padding: 32px;
  max-width: 1600px;
  margin: 0 auto;
  background: #f8fafc;
  min-height: calc(100vh - 80px);
`;

const Header = styled.div`
  margin-bottom: 32px;
  
  h1 {
    font-size: 32px;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 8px 0;
    letter-spacing: -0.5px;
  }
  
  p {
    font-size: 15px;
    color: #64748b;
    margin: 0;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
`;

const StatCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`;

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  
  .icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${({ bg }) => bg || '#eff6ff'};
    color: ${({ color }) => color || '#2563eb'};
  }
`;

const StatValue = styled.div`
  font-size: 32px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
`;

const FiltersBar = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: ${props => props.flex || '0 0 auto'};
  min-width: ${props => props.minWidth || '150px'};
`;

const FilterLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SearchInput = styled.div`
  flex: 1;
  min-width: 280px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  input {
    width: 100%;
    padding: 14px 16px 14px 48px;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    font-size: 14px;
    color: #0f172a;
    background: white;
    transition: all 0.2s ease;
    font-weight: 500;
    
    &:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
      background: #ffffff;
    }
    
    &::placeholder {
      color: #94a3b8;
      font-weight: 400;
    }
  }
  
  svg {
    position: absolute;
    left: 16px;
    top: calc(50% + 4px);
    transform: translateY(-50%);
    color: #94a3b8;
    pointer-events: none;
  }
`;

const Select = styled.select`
  padding: 14px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  color: #0f172a;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23475569' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
  padding-right: 40px;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }
  
  &:hover {
    border-color: #cbd5e1;
  }
  
  option {
    padding: 12px;
    font-weight: 500;
  }
`;

const ClearFiltersButton = styled.button`
  padding: 14px 20px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  
  &:hover {
    border-color: #ef4444;
    color: #ef4444;
    background: #fef2f2;
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

const TasksTable = styled.div`
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr 1fr auto;
  gap: 16px;
  padding: 16px 24px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  @media (max-width: 1200px) {
    grid-template-columns: 2fr 1.5fr 1fr 1fr auto;
    .hide-mobile {
      display: none;
    }
  }
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr 1fr auto;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  align-items: center;
  transition: background 0.15s ease;
  
  &:hover {
    background: #f8fafc;
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  @media (max-width: 1200px) {
    grid-template-columns: 2fr 1.5fr 1fr 1fr auto;
    .hide-mobile {
      display: none;
    }
  }
`;

const TaskTitle = styled.div`
  font-weight: 600;
  color: #0f172a;
  font-size: 14px;
  line-height: 1.5;
  
  .description {
    font-size: 12px;
    color: #64748b;
    margin-top: 4px;
    font-weight: 400;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

const UserBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #475569;
  
  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 12px;
  }
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
  background: ${({ bg }) => bg};
  color: ${({ color }) => color};
`;

const PriorityBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
  background: ${({ bg }) => bg};
  color: ${({ color }) => color};
`;

const ActionButton = styled.button`
  padding: 8px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
  
  &:hover {
    border-color: #3b82f6;
    color: #2563eb;
    background: #eff6ff;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  max-width: ${props => props.large ? '700px' : '500px'};
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  
  h2 {
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
  }
  
  button {
    border: none;
    background: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    border-radius: 6px;
    
    &:hover {
      background: #f1f5f9;
      color: #64748b;
    }
  }
`;

const UserList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
`;

const UserOption = styled.button`
  padding: 12px 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 12px;
  
  &:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }
  
  &.selected {
    border-color: #2563eb;
    background: #eff6ff;
  }
  
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 14px;
    flex-shrink: 0;
  }
  
  .info {
    flex: 1;
    
    .name {
      font-weight: 600;
      color: #0f172a;
      font-size: 14px;
      margin-bottom: 2px;
    }
    
    .email {
      font-size: 12px;
      color: #64748b;
    }
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #64748b;
  gap: 12px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
  
  svg {
    margin: 0 auto 16px;
    color: #cbd5e1;
  }
  
  h3 {
    font-size: 18px;
    font-weight: 600;
    color: #475569;
    margin: 0 0 8px 0;
  }
  
  p {
    font-size: 14px;
    margin: 0;
  }
`;

const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
`;

const PaginationInfo = styled.div`
  font-size: 14px;
  color: #64748b;
`;

const PaginationButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const PaginationButton = styled.button`
  padding: 8px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  
  &:hover:not(:disabled) {
    border-color: #3b82f6;
    color: #2563eb;
    background: #eff6ff;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &.active {
    border-color: #2563eb;
    background: #2563eb;
    color: white;
  }
`;

const TaskPreviewSection = styled.div`
  margin-bottom: 24px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .label {
    font-size: 12px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .value {
    font-size: 15px;
    color: #0f172a;
    line-height: 1.6;
  }
  
  .description {
    background: #f8fafc;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: #eff6ff;
    color: #2563eb;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
  }
  
  .info-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #f1f5f9;
    
    &:last-child {
      border-bottom: none;
    }
  }
  
  .info-label {
    font-size: 14px;
    color: #64748b;
    min-width: 120px;
    font-weight: 500;
  }
  
  .info-value {
    font-size: 14px;
    color: #0f172a;
    font-weight: 500;
  }
`;

const ActionButtonsGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const AdminDashboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    userId: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [assigningUserId, setAssigningUserId] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTask, setPreviewTask] = useState(null);

  const limit = 20;

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [filters, sortBy, sortOrder, page]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }));
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchUsers = async () => {
    try {
      const response = await adminAPI.listUsers();
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await adminAPI.getTaskStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        sortBy,
        sortOrder,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '')),
      };
      const response = await adminAPI.getAllTasks(params);
      setTasks(response.data.tasks || []);
      setPagination(response.data.pagination || { current: 1, pages: 1, total: 0 });
    } catch (error) {
      console.error('Failed to load tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTask = (task) => {
    setSelectedTask(task);
    setAssigningUserId(task.user?._id || null);
    setShowAssignModal(true);
  };

  const handlePreviewTask = (task) => {
    setPreviewTask(task);
    setShowPreviewModal(true);
  };

  const handleConfirmAssign = async () => {
    if (!selectedTask || !assigningUserId) return;

    setIsAssigning(true);
    try {
      const response = await adminAPI.assignTask(selectedTask._id, assigningUserId);
      setTasks(prev => prev.map(t => t._id === selectedTask._id ? response.data.task : t));
      setShowAssignModal(false);
      setSelectedTask(null);
      setAssigningUserId(null);
      toast.success('Task assigned successfully!');
      fetchStats(); // Refresh stats
    } catch (error) {
      console.error('Failed to assign task:', error);
      toast.error(error.response?.data?.message || 'Failed to assign task');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { bg: '#fef3c7', color: '#92400e', icon: Clock },
      'in-progress': { bg: '#dbeafe', color: '#1e40af', icon: TrendingUp },
      completed: { bg: '#d1fae5', color: '#065f46', icon: CheckCircle2 },
      cancelled: { bg: '#fee2e2', color: '#991b1b', icon: XCircle },
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    return (
      <StatusBadge bg={config.bg} color={config.color}>
        <Icon size={12} />
        {status}
      </StatusBadge>
    );
  };

  const getPriorityBadge = (priority) => {
    const configs = {
      low: { bg: '#f1f5f9', color: '#475569' },
      medium: { bg: '#fef3c7', color: '#92400e' },
      high: { bg: '#fed7aa', color: '#9a3412' },
      urgent: { bg: '#fee2e2', color: '#991b1b' },
    };
    const config = configs[priority] || configs.medium;
    return (
      <PriorityBadge bg={config.bg} color={config.color}>
        {priority}
      </PriorityBadge>
    );
  };

  const getUserInitials = (user) => {
    if (!user) return '?';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return (user.email || '?')[0].toUpperCase();
  };

  const getUserDisplayName = (user) => {
    if (!user) return 'Unassigned';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email || 'Unknown';
  };

  const stripHtmlTags = (html) => {
    if (!html) return '';
    // Create a temporary DOM element to extract text content
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const hasActiveFilters = () => {
    return filters.search || filters.status || filters.priority || filters.userId;
  };

  const clearAllFilters = () => {
    setFilters({
      search: '',
      status: '',
      priority: '',
      userId: '',
    });
    setSearchInput('');
    setPage(1);
  };

  if (!user?.roles?.includes('admin')) {
    return (
      <DashboardContainer>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            Access Denied
          </h2>
          <p style={{ color: '#64748b' }}>You need administrator privileges to access this page.</p>
        </div>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <Header>
        <h1>Admin Dashboard</h1>
        <p>Manage all tasks, assignments, and monitor team productivity</p>
      </Header>

      {loadingStats ? (
          <LoadingSpinner>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            Loading statistics...
          </LoadingSpinner>
      ) : stats && (
        <StatsGrid>
          <StatCard>
            <StatHeader>
              <div className="icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <FileText size={24} />
              </div>
            </StatHeader>
            <StatValue>{stats.overview.total}</StatValue>
            <StatLabel>Total Tasks</StatLabel>
          </StatCard>
          <StatCard>
            <StatHeader>
              <div className="icon" style={{ background: '#fef3c7', color: '#92400e' }}>
                <Clock size={24} />
              </div>
            </StatHeader>
            <StatValue>{stats.overview.pending}</StatValue>
            <StatLabel>Pending</StatLabel>
          </StatCard>
          <StatCard>
            <StatHeader>
              <div className="icon" style={{ background: '#dbeafe', color: '#1e40af' }}>
                <TrendingUp size={24} />
              </div>
            </StatHeader>
            <StatValue>{stats.overview.inProgress}</StatValue>
            <StatLabel>In Progress</StatLabel>
          </StatCard>
          <StatCard>
            <StatHeader>
              <div className="icon" style={{ background: '#d1fae5', color: '#065f46' }}>
                <CheckCircle2 size={24} />
              </div>
            </StatHeader>
            <StatValue>{stats.overview.completed}</StatValue>
            <StatLabel>Completed</StatLabel>
          </StatCard>
        </StatsGrid>
      )}

      <FiltersBar>
        <SearchInput>
          <FilterLabel>
            <Search size={14} />
            Search Tasks
          </FilterLabel>
          <input
            type="text"
            placeholder="Search by title or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </SearchInput>
        
        <FilterGroup minWidth="160px">
          <FilterLabel>
            <Filter size={14} />
            Status
          </FilterLabel>
          <Select
            value={filters.status}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, status: e.target.value }));
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </FilterGroup>

        <FilterGroup minWidth="160px">
          <FilterLabel>
            <AlertCircle size={14} />
            Priority
          </FilterLabel>
          <Select
            value={filters.priority}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, priority: e.target.value }));
              setPage(1);
            }}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </FilterGroup>

        <FilterGroup minWidth="180px">
          <FilterLabel>
            <User size={14} />
            Assigned To
          </FilterLabel>
          <Select
            value={filters.userId}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, userId: e.target.value }));
              setPage(1);
            }}
          >
            <option value="">All Users</option>
            {users.map(u => (
              <option key={u._id} value={u._id}>
                {getUserDisplayName(u)}
              </option>
            ))}
          </Select>
        </FilterGroup>

        {hasActiveFilters() && (
          <ClearFiltersButton onClick={clearAllFilters}>
            <XCircle size={16} />
            Clear Filters
          </ClearFiltersButton>
        )}
      </FiltersBar>

      <TasksTable>
        <TableHeader>
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => handleSort('title')}>
            Task
            <ArrowUpDown size={14} />
          </div>
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => handleSort('user')}>
            Assigned To
            <ArrowUpDown size={14} />
          </div>
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => handleSort('status')}>
            Status
            <ArrowUpDown size={14} />
          </div>
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => handleSort('priority')}>
            Priority
            <ArrowUpDown size={14} />
          </div>
          <div className="hide-mobile" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => handleSort('dueDate')}>
            Due Date
            <ArrowUpDown size={14} />
          </div>
          <div className="hide-mobile" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => handleSort('createdAt')}>
            Created
            <ArrowUpDown size={14} />
          </div>
          <div>Actions</div>
        </TableHeader>

        {loading ? (
          <LoadingSpinner>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            Loading tasks...
          </LoadingSpinner>
        ) : tasks.length === 0 ? (
          <EmptyState>
            <FileText size={48} />
            <h3>No tasks found</h3>
            <p>Try adjusting your filters to see more results.</p>
          </EmptyState>
        ) : (
          <>
            {tasks.map(task => (
              <TableRow key={task._id}>
                <TaskTitle>
                  {task.title}
                </TaskTitle>
                <UserBadge>
                  <div className="avatar">
                    {getUserInitials(task.user)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      {getUserDisplayName(task.user)}
                    </div>
                    {task.user?.email && (
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {task.user.email}
                      </div>
                    )}
                  </div>
                </UserBadge>
                <div>{getStatusBadge(task.status)}</div>
                <div>{getPriorityBadge(task.priority)}</div>
                <div className="hide-mobile" style={{ fontSize: '13px', color: '#64748b' }}>
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                </div>
                <div className="hide-mobile" style={{ fontSize: '13px', color: '#64748b' }}>
                  {new Date(task.createdAt).toLocaleDateString()}
                </div>
                <div>
                  <ActionButtonsGroup>
                    <ActionButton onClick={() => handlePreviewTask(task)}>
                      <Eye size={14} />
                      Preview
                    </ActionButton>
                    <ActionButton onClick={() => handleAssignTask(task)}>
                      <UserPlus size={14} />
                      Assign
                    </ActionButton>
                  </ActionButtonsGroup>
                </div>
              </TableRow>
            ))}
            <Pagination>
              <PaginationInfo>
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} tasks
              </PaginationInfo>
              <PaginationButtons>
                <PaginationButton
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                >
                  Previous
                </PaginationButton>
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  let pageNum;
                  if (pagination.pages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= pagination.pages - 2) {
                    pageNum = pagination.pages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <PaginationButton
                      key={pageNum}
                      className={page === pageNum ? 'active' : ''}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </PaginationButton>
                  );
                })}
                <PaginationButton
                  onClick={() => setPage(prev => Math.min(pagination.pages, prev + 1))}
                  disabled={page === pagination.pages}
                >
                  Next
                </PaginationButton>
              </PaginationButtons>
            </Pagination>
          </>
        )}
      </TasksTable>

      {showAssignModal && (
        <ModalOverlay onClick={() => !isAssigning && setShowAssignModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h2>Assign Task</h2>
              <button onClick={() => !isAssigning && setShowAssignModal(false)} disabled={isAssigning}>
                <XCircle size={20} />
              </button>
            </ModalHeader>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>Task:</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                {selectedTask?.title}
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>
                Select User:
              </div>
              <UserList>
                {users.map(u => (
                  <UserOption
                    key={u._id}
                    className={assigningUserId === u._id ? 'selected' : ''}
                    onClick={() => setAssigningUserId(u._id)}
                  >
                    <div className="avatar">
                      {getUserInitials(u)}
                    </div>
                    <div className="info">
                      <div className="name">{getUserDisplayName(u)}</div>
                      <div className="email">{u.email}</div>
                    </div>
                  </UserOption>
                ))}
              </UserList>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <ActionButton
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedTask(null);
                  setAssigningUserId(null);
                }}
                disabled={isAssigning}
              >
                Cancel
              </ActionButton>
              <ActionButton
                onClick={handleConfirmAssign}
                disabled={!assigningUserId || isAssigning}
                style={{
                  background: '#2563eb',
                  color: 'white',
                  borderColor: '#2563eb',
                }}
              >
                {isAssigning ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserPlus size={14} />
                    Assign Task
                  </>
                )}
              </ActionButton>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

      {showPreviewModal && previewTask && (
        <ModalOverlay onClick={() => setShowPreviewModal(false)}>
          <ModalContent large onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h2>Task Preview</h2>
              <button onClick={() => setShowPreviewModal(false)}>
                <XCircle size={20} />
              </button>
            </ModalHeader>

            <TaskPreviewSection>
              <div className="label">
                <FileText size={14} />
                Title
              </div>
              <div className="value" style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
                {previewTask.title}
              </div>
            </TaskPreviewSection>

            {previewTask.description && (
              <TaskPreviewSection>
                <div className="label">
                  <FileText size={14} />
                  Description
                </div>
                <div className="value description">
                  {stripHtmlTags(previewTask.description)}
                </div>
              </TaskPreviewSection>
            )}

            <TaskPreviewSection>
              <div className="info-row">
                <div className="info-label">Status:</div>
                <div className="info-value">{getStatusBadge(previewTask.status)}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Priority:</div>
                <div className="info-value">{getPriorityBadge(previewTask.priority)}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Assigned To:</div>
                <div className="info-value">
                  {previewTask.user ? (
                    <UserBadge>
                      <div className="avatar">
                        {getUserInitials(previewTask.user)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {getUserDisplayName(previewTask.user)}
                        </div>
                        {previewTask.user?.email && (
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {previewTask.user.email}
                          </div>
                        )}
                      </div>
                    </UserBadge>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>Unassigned</span>
                  )}
                </div>
              </div>
              {previewTask.dueDate && (
                <div className="info-row">
                  <div className="info-label">
                    <Calendar size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Due Date:
                  </div>
                  <div className="info-value">
                    {new Date(previewTask.dueDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              )}
              <div className="info-row">
                <div className="info-label">
                  <Clock size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Created:
                </div>
                <div className="info-value">
                  {new Date(previewTask.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              {previewTask.updatedAt && (
                <div className="info-row">
                  <div className="info-label">
                    <Clock size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Last Updated:
                  </div>
                  <div className="info-value">
                    {new Date(previewTask.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              )}
              {previewTask.completedAt && (
                <div className="info-row">
                  <div className="info-label">
                    <CheckCircle2 size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Completed:
                  </div>
                  <div className="info-value">
                    {new Date(previewTask.completedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              )}
            </TaskPreviewSection>

            {previewTask.tags && previewTask.tags.length > 0 && (
              <TaskPreviewSection>
                <div className="label">
                  <Tag size={14} />
                  Tags
                </div>
                <div className="tags">
                  {previewTask.tags.map((tag, index) => (
                    <span key={index} className="tag">
                      <Tag size={12} />
                      {tag}
                    </span>
                  ))}
                </div>
              </TaskPreviewSection>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
              <ActionButton onClick={() => setShowPreviewModal(false)}>
                Close
              </ActionButton>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}
    </DashboardContainer>
  );
};

export default AdminDashboard;

