import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { CommandPalette, useCommandPalette } from './CommandPalette';
import { PageSkeleton } from './AppLoader';
import { hasPermission } from '../utils/permissions';
import {
  LayoutDashboard,
  ListTodo,
  Inbox,
  FolderKanban,
  CalendarDays,
  Settings as SettingsIcon,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Menu,
  Search,
  Plus,
  Sun,
  Moon,
  ChevronsUpDown,
} from 'lucide-react';

const SIDEBAR_KEY = 'workpilot-sidebar-collapsed';

const LayoutWrapper = styled.div`
  height: 100dvh;
  background: var(--wp-bg);
  display: flex;
  color: var(--wp-text);
  overflow: hidden;
`;

const Sidebar = styled.aside`
  width: ${({ $collapsed }) => ($collapsed ? '60px' : '232px')};
  height: 100dvh;
  background: var(--wp-sidebar-bg);
  border-right: 1px solid var(--wp-sidebar-border);
  color: var(--wp-sidebar-text);
  padding: 12px ${({ $collapsed }) => ($collapsed ? '8px' : '10px')};
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  overflow-x: hidden;
  flex-shrink: 0;
  z-index: 220;
  transition: width 0.16s ease;

  @media (max-width: 1024px) {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 248px;
    padding: 12px 10px;
    transform: translateX(${(p) => (p.$open ? '0' : '-100%')});
    transition: transform 0.18s ease;
    box-shadow: ${(p) => (p.$open ? 'var(--wp-shadow-xl)' : 'none')};
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  padding: 0 ${({ $collapsed }) => ($collapsed ? '4px' : '6px')};
  min-width: 0;

  .name {
    font-size: 14px;
    font-weight: 700;
    color: var(--wp-sidebar-text-strong);
    white-space: nowrap;
    line-height: 1.1;
  }

  .sub {
    font-size: 11px;
    color: var(--wp-sidebar-text);
    white-space: nowrap;
  }
`;

const BrandMark = styled.div`
  width: 28px;
  height: 28px;
  border-radius: var(--wp-radius);
  background: var(--wp-primary);
  color: #fff;
  display: grid;
  place-items: center;
  font-family: var(--wp-font-mono);
  font-weight: 700;
  font-size: 12px;
  flex-shrink: 0;
`;

const SidebarSearch = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  width: 100%;
  padding: ${({ $collapsed }) => ($collapsed ? '0' : '0 10px')};
  justify-content: ${({ $collapsed }) => ($collapsed ? 'center' : 'flex-start')};
  border-radius: var(--wp-radius);
  border: 1px solid var(--wp-sidebar-border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--wp-sidebar-text);
  font-size: 13px;
  cursor: pointer;

  &:hover {
    background: var(--wp-sidebar-hover);
    color: var(--wp-sidebar-text-strong);
  }

  .label {
    flex: 1;
    text-align: left;
  }
`;

const Kbd = styled.kbd`
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 5px;
  border-radius: 4px;
  font-family: var(--wp-font-mono);
  font-size: 10px;
  line-height: 1;
  border: 1px solid ${(p) => (p.$dark ? 'var(--wp-sidebar-border)' : 'var(--wp-border)')};
  background: ${(p) => (p.$dark ? 'rgba(255,255,255,0.04)' : 'var(--wp-surface-2)')};
  color: ${(p) => (p.$dark ? 'var(--wp-sidebar-text)' : 'var(--wp-text-subtle)')};
`;

const NavSection = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const NavHeading = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--wp-text-subtle);
  padding: 6px 10px 4px;
  ${({ $collapsed }) => ($collapsed ? 'visibility: hidden; height: 8px; padding: 0;' : '')}
`;

const StyledNavLink = styled(NavLink)`
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 32px;
  padding: 0 10px;
  justify-content: ${({ $collapsed }) => ($collapsed ? 'center' : 'flex-start')};
  border-radius: var(--wp-radius);
  font-size: 13px;
  font-weight: 500;
  color: var(--wp-sidebar-text);
  text-decoration: none;

  &:hover {
    background: var(--wp-sidebar-hover);
    color: var(--wp-sidebar-text-strong);
  }

  &.active {
    background: var(--wp-sidebar-active);
    color: var(--wp-sidebar-text-strong);

    &::before {
      content: '';
      position: absolute;
      left: -10px;
      top: 7px;
      bottom: 7px;
      width: 3px;
      border-radius: 0 3px 3px 0;
      background: var(--wp-sidebar-accent);
    }

    svg {
      color: var(--wp-sidebar-accent);
    }
  }

  .nav-label {
    flex: 1;
    ${({ $collapsed }) => ($collapsed ? 'display: none;' : '')}
  }

  .nav-key {
    ${({ $collapsed }) => ($collapsed ? 'display: none;' : '')}
    opacity: 0;
  }

  &:hover .nav-key {
    opacity: 1;
  }
`;

const SidebarFooter = styled.div`
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--wp-sidebar-border);
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SidebarButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 32px;
  width: 100%;
  padding: 0 10px;
  justify-content: ${({ $collapsed }) => ($collapsed ? 'center' : 'flex-start')};
  border: none;
  border-radius: var(--wp-radius);
  background: transparent;
  color: var(--wp-sidebar-text);
  font-size: 13px;
  cursor: pointer;

  &:hover {
    background: var(--wp-sidebar-hover);
    color: var(--wp-sidebar-text-strong);
  }

  @media (max-width: 1024px) {
    &.desktop-only {
      display: none;
    }
  }
`;

const UserMenuWrap = styled.div`
  position: relative;
`;

const UserButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px ${({ $collapsed }) => ($collapsed ? '0' : '8px')};
  justify-content: ${({ $collapsed }) => ($collapsed ? 'center' : 'flex-start')};
  border: none;
  border-radius: var(--wp-radius);
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: var(--wp-sidebar-text-strong);

  &:hover {
    background: var(--wp-sidebar-hover);
  }

  .info {
    flex: 1;
    min-width: 0;
    ${({ $collapsed }) => ($collapsed ? 'display: none;' : '')}
  }

  .name {
    font-size: 13px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .role {
    font-size: 11px;
    color: var(--wp-sidebar-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chev {
    color: var(--wp-sidebar-text);
    ${({ $collapsed }) => ($collapsed ? 'display: none;' : '')}
  }
`;

const Avatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: var(--wp-radius);
  background: #2b3340;
  color: #e8ebef;
  font-size: 11px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
`;

const Dropdown = styled.div`
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  min-width: 212px;
  background: var(--wp-surface-elevated);
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);
  box-shadow: var(--wp-shadow-lg);
  padding: 4px;
  z-index: 300;

  .head {
    padding: 8px 10px;
    border-bottom: 1px solid var(--wp-border-subtle);
    margin-bottom: 4px;
    font-size: 12px;
    color: var(--wp-text-subtle);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const DropdownItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 32px;
  padding: 0 10px;
  border: none;
  border-radius: var(--wp-radius-sm);
  background: transparent;
  font-size: 13px;
  color: var(--wp-text);
  cursor: pointer;
  text-align: left;

  &:hover {
    background: var(--wp-hover);
  }

  &.danger {
    color: var(--wp-error);
  }
`;

const ContentArea = styled.main`
  flex: 1;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
`;

const TopBar = styled.header`
  display: flex;
  align-items: center;
  gap: 12px;
  height: 52px;
  padding: 0 20px;
  border-bottom: 1px solid var(--wp-border);
  background: var(--wp-header-bg);
  flex-shrink: 0;
  z-index: 100;

  @media (max-width: 768px) {
    padding: 0 12px;
    gap: 8px;
  }
`;

const TopTitle = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  flex: 1;

  h1 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--wp-text);
    white-space: nowrap;
  }

  span {
    font-size: 12px;
    color: var(--wp-text-subtle);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @media (max-width: 640px) {
      display: none;
    }
  }
`;

const HeaderButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 10px;
  border-radius: var(--wp-radius);
  border: 1px solid var(--wp-border);
  background: var(--wp-surface);
  color: var(--wp-text-muted);
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: var(--wp-surface-2);
    color: var(--wp-text);
    border-color: var(--wp-border-strong);
  }

  &.icon {
    width: 32px;
    padding: 0;
    justify-content: center;
  }

  &.search {
    min-width: 220px;

    .label {
      flex: 1;
      text-align: left;
      color: var(--wp-text-subtle);
    }

    @media (max-width: 900px) {
      min-width: 0;
      width: 32px;
      padding: 0;
      justify-content: center;

      .label,
      kbd {
        display: none;
      }
    }
  }

  &.mobile-only {
    @media (min-width: 1025px) {
      display: none;
    }
  }
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: var(--wp-radius);
  border: 1px solid var(--wp-primary);
  background: var(--wp-primary);
  color: var(--wp-on-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: var(--wp-primary-hover);
    border-color: var(--wp-primary-hover);
  }

  kbd {
    border-color: rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
  }

  @media (max-width: 640px) {
    .label,
    kbd {
      display: none;
    }
  }
`;

const PageScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--wp-bg);

  &:focus {
    outline: none;
  }
`;

const SidebarOverlay = styled.button`
  display: none;
  position: fixed;
  inset: 0;
  border: none;
  background: var(--wp-overlay);
  z-index: 200;
  padding: 0;
  cursor: default;

  @media (max-width: 1024px) {
    display: ${(p) => (p.$show ? 'block' : 'none')};
  }
`;

const SkipLink = styled.a`
  position: absolute;
  left: -9999px;
  top: 8px;
  z-index: 9999;
  padding: 8px 16px;
  background: var(--wp-primary);
  color: var(--wp-on-primary);
  border-radius: var(--wp-radius);
  font-weight: 600;
  text-decoration: none;

  &:focus {
    left: 8px;
  }
`;

const PAGES = {
  '/': { title: 'My work', sub: 'Your open tasks across all projects' },
  '/tasks': { title: 'Tasks', sub: 'Plan, track and deliver project work' },
  '/projects': { title: 'Projects', sub: 'Portfolio, progress and ownership' },
  '/calendar': { title: 'Calendar', sub: 'Deadlines and meetings' },
  '/admin': { title: 'Dashboard', sub: 'Team, roles and workload' },
  '/settings': { title: 'Settings', sub: 'Workspace configuration' },
};

const GOTO_KEYS = { m: '/', t: '/tasks', p: '/projects', c: '/calendar', d: '/admin', s: '/settings' };

function getInitials(user) {
  const name = user?.fullName || user?.email || '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function readCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1';
  } catch {
    return false;
  }
}

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(readCollapsed);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const palette = useCommandPalette();
  const closePalette = palette.close;

  const closeSidebar = () => setIsSidebarOpen(false);
  const isAdmin = user?.roles?.includes('admin');
  const canOpenSettings = isAdmin || user?.permissions?.includes('kanban.manage');
  const canCreateTask = hasPermission(user, 'tasks.create');
  const page = PAGES[location.pathname] || { title: 'WorkPilot', sub: '' };
  const roleLabel = isAdmin ? 'Administrator' : user?.roles?.[0] || 'Member';

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      } catch {
        /* storage unavailable: keep in-memory state */
      }
      return next;
    });
  };

  useEffect(() => {
    const onClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleCreateTask = useCallback(() => {
    closePalette();
    navigate('/tasks', { state: { openCreateTask: true } });
  }, [navigate, closePalette]);

  // Global single-key shortcuts: N = new task, G then T/C/D/S = go to page.
  const allowedRef = useRef({});
  allowedRef.current = {
    '/': true,
    '/tasks': true,
    '/projects': true,
    '/calendar': true,
    '/admin': isAdmin,
    '/settings': canOpenSettings,
  };
  useEffect(() => {
    let gotoArmedUntil = 0;
    const onKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const key = e.key.toLowerCase();
      if (Date.now() < gotoArmedUntil && GOTO_KEYS[key]) {
        gotoArmedUntil = 0;
        const path = GOTO_KEYS[key];
        if (allowedRef.current[path]) {
          e.preventDefault();
          navigate(path);
        }
        return;
      }
      if (key === 'g') {
        gotoArmedUntil = Date.now() + 1200;
        return;
      }
      if (key === 'n' && canCreateTask) {
        e.preventDefault();
        handleCreateTask();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, handleCreateTask, canCreateTask]);

  const navItem = (to, Icon, label, key, end) => (
    <StyledNavLink
      to={to}
      end={end}
      $collapsed={isCollapsed}
      onClick={closeSidebar}
      title={isCollapsed ? label : undefined}
    >
      <Icon size={16} aria-hidden />
      <span className="nav-label">{label}</span>
      <Kbd $dark className="nav-key">G {key}</Kbd>
    </StyledNavLink>
  );

  return (
    <LayoutWrapper>
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <SidebarOverlay $show={isSidebarOpen} onClick={closeSidebar} aria-label="Close navigation" />
      <Sidebar $open={isSidebarOpen} $collapsed={isCollapsed}>
        <Brand $collapsed={isCollapsed}>
          <BrandMark>WP</BrandMark>
          {!isCollapsed && (
            <div>
              <div className="name">WorkPilot</div>
              <div className="sub">Engineering workspace</div>
            </div>
          )}
        </Brand>

        <SidebarSearch
          type="button"
          $collapsed={isCollapsed}
          onClick={() => palette.setOpen(true)}
          aria-label="Search and commands (Ctrl+K)"
          title="Search and commands (Ctrl+K)"
        >
          <Search size={14} />
          {!isCollapsed && (
            <>
              <span className="label">Jump to…</span>
              <Kbd $dark>Ctrl K</Kbd>
            </>
          )}
        </SidebarSearch>

        <NavSection aria-label="Workspace">
          <NavHeading $collapsed={isCollapsed}>Workspace</NavHeading>
          {navItem('/', Inbox, 'My work', 'M', true)}
          {navItem('/tasks', ListTodo, 'Tasks', 'T')}
          {navItem('/projects', FolderKanban, 'Projects', 'P')}
          {navItem('/calendar', CalendarDays, 'Calendar', 'C')}
        </NavSection>

        {(isAdmin || canOpenSettings) && (
          <NavSection aria-label="Administration">
            <NavHeading $collapsed={isCollapsed}>Administration</NavHeading>
            {isAdmin && navItem('/admin', LayoutDashboard, 'Dashboard', 'D')}
            {canOpenSettings && navItem('/settings', SettingsIcon, 'Settings', 'S')}
          </NavSection>
        )}

        <SidebarFooter>
          <SidebarButton
            type="button"
            className="desktop-only"
            $collapsed={isCollapsed}
            onClick={toggleCollapsed}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            {!isCollapsed && <span>Collapse</span>}
          </SidebarButton>
          <UserMenuWrap ref={userMenuRef}>
            {userMenuOpen && (
              <Dropdown role="menu">
                <div className="head">{user?.email}</div>
                <DropdownItem type="button" role="menuitem" onClick={toggleTheme}>
                  {isDark ? <Sun size={15} /> : <Moon size={15} />}
                  {isDark ? 'Light theme' : 'Dark theme'}
                </DropdownItem>
                <DropdownItem type="button" role="menuitem" className="danger" onClick={logout}>
                  <LogOut size={15} />
                  Sign out
                </DropdownItem>
              </Dropdown>
            )}
            <UserButton
              type="button"
              $collapsed={isCollapsed}
              onClick={() => setUserMenuOpen((p) => !p)}
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              title={isCollapsed ? user?.fullName || user?.email : undefined}
            >
              <Avatar>{getInitials(user)}</Avatar>
              <div className="info">
                <div className="name">{user?.fullName || user?.email || 'User'}</div>
                <div className="role">{roleLabel}</div>
              </div>
              <ChevronsUpDown size={14} className="chev" />
            </UserButton>
          </UserMenuWrap>
        </SidebarFooter>
      </Sidebar>

      <ContentArea>
        <TopBar>
          <HeaderButton
            type="button"
            className="icon mobile-only"
            onClick={() => setIsSidebarOpen((p) => !p)}
            aria-label="Open menu"
          >
            <Menu size={16} />
          </HeaderButton>
          <TopTitle>
            <h1>{page.title}</h1>
            <span>{page.sub}</span>
          </TopTitle>
          <HeaderButton
            type="button"
            className="search"
            onClick={() => palette.setOpen(true)}
            aria-label="Search and commands (Ctrl+K)"
          >
            <Search size={14} />
            <span className="label">Search or run a command</span>
            <Kbd>Ctrl K</Kbd>
          </HeaderButton>
          <HeaderButton
            type="button"
            className="icon"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Light theme' : 'Dark theme'}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </HeaderButton>
          {canCreateTask && (
            <PrimaryButton type="button" onClick={handleCreateTask} title="New task (N)">
              <Plus size={15} />
              <span className="label">New task</span>
              <Kbd>N</Kbd>
            </PrimaryButton>
          )}
        </TopBar>

        <PageScroll id="main-content" tabIndex={-1}>
          <Suspense fallback={<PageSkeleton path={location.pathname} />}>
            <Outlet />
          </Suspense>
        </PageScroll>
      </ContentArea>

      <CommandPalette
        open={palette.open}
        onClose={palette.close}
        onCreateTask={handleCreateTask}
      />
    </LayoutWrapper>
  );
};

export default DashboardLayout;
