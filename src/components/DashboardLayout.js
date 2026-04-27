import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  ListTodo,
  CalendarDays,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';

const LayoutWrapper = styled.div`
  height: 100dvh;
  background: #f8fafc;
  display: flex;
  color: #0f172a;
  overflow: hidden;
`;

const Sidebar = styled.aside`
  width: ${({ $collapsed }) => ($collapsed ? '92px' : '300px')};
  height: 100dvh;
  border-right: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  padding: ${({ $collapsed }) => ($collapsed ? '24px 0' : '24px 16px')};
  display: flex;
  flex-direction: column;
  gap: 22px;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  z-index: 220;
  transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: 1024px) {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 210;
    transform: translateX(${(props) => (props.open ? '0' : '-100%')});
    transition: transform 0.22s ease;
    box-shadow: ${(props) =>
      props.open ? '0 24px 60px rgba(15, 23, 42, 0.22)' : 'none'};
  }
`;

const SidebarTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  ${({ $collapsed }) =>
    $collapsed &&
    `
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
  `}
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  width: 100%;
  justify-content: flex-start;
  transition: justify-content 0.26s cubic-bezier(0.4, 0, 0.2, 1), gap 0.26s cubic-bezier(0.4, 0, 0.2, 1);

  ${({ $collapsed }) =>
    $collapsed &&
    `
    justify-content: center;
    gap: 0;
  `}

  span {
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.3px;
    white-space: nowrap;
    transition: opacity 0.22s ease, transform 0.22s ease;
    ${({ $collapsed }) =>
      $collapsed
        ? `
      opacity: 0;
      transform: translateX(-4px);
      pointer-events: none;
    `
        : `
      opacity: 1;
      transform: translateX(0);
    `}
  }
`;

const BrandLogo = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
`;

const Navigation = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const StyledNavLink = styled(NavLink)`
  width: ${({ $collapsed }) => ($collapsed ? '72px' : '100%')};
  margin: ${({ $collapsed }) => ($collapsed ? '0 auto' : '0')};
  padding: ${({ $collapsed }) => ($collapsed ? '10px 8px' : '12px 14px')};
  border-radius: 12px;
  font-weight: 600;
  font-size: ${({ $collapsed }) => ($collapsed ? '12px' : '14px')};
  color: #475569;
  text-decoration: none;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease,
    padding 0.26s cubic-bezier(0.4, 0, 0.2, 1),
    gap 0.26s cubic-bezier(0.4, 0, 0.2, 1),
    font-size 0.26s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  display: flex;
  flex-direction: ${({ $collapsed }) => ($collapsed ? 'column' : 'row')};
  align-items: center;
  justify-content: ${({ $collapsed }) => ($collapsed ? 'center' : 'flex-start')};
  gap: ${({ $collapsed }) => ($collapsed ? '6px' : '10px')};
  position: relative;

  &.active {
    color: #2563eb;
    border-color: #bfdbfe;
    background: linear-gradient(135deg, #eff6ff 0%, #e5f0ff 100%);
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.14);
  }

  &:hover {
    color: #2563eb;
    background: rgba(37, 99, 235, 0.08);
  }

  .nav-label {
    ${({ $collapsed }) =>
      $collapsed
        ? `
      white-space: normal;
      text-align: center;
      font-size: 11px;
      line-height: 1.3;
      max-width: 72px;
    `
        : `
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: left;
    `}
  }
`;

const SidebarFooter = styled.div`
  margin-top: auto;
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
`;
const CollapseIconButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  flex-shrink: 0;

  &:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
    color: #1e40af;
  }
`;

const MobileHeader = styled.header`
  display: none;
  height: 68px;
  padding: 0 18px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 150;

  @media (max-width: 1024px) {
    display: flex;
  }
`;

const MobileMenuButton = styled.button`
  border: none;
  background: none;
  font-size: 22px;
  cursor: pointer;
  color: #475569;
`;

const UserControls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const UserMeta = styled.div`
  width: 100%;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;

  span:first-child {
    font-weight: 600;
    font-size: 14px;
    color: #0f172a;
  }

  span:last-child {
    font-size: 12px;
    color: #64748b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const LogoutButton = styled.button`
  width: ${({ $collapsed }) => ($collapsed ? '72px' : '100%')};
  margin: ${({ $collapsed }) => ($collapsed ? '0 auto' : '0')};
  padding: 11px 16px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(239, 68, 68, 0.25);
  }

  .label {
    ${({ $collapsed }) => $collapsed && 'display: none;'}
  }
`;

const SidebarOverlay = styled.button`
  display: none;
  position: fixed;
  inset: 0;
  border: none;
  background: rgba(15, 23, 42, 0.35);
  z-index: 200;
  padding: 0;

  @media (max-width: 1024px) {
    display: ${(props) => (props.show ? 'block' : 'none')};
  }
`;

const ContentArea = styled.main`
  flex: 1;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-y: auto;

  @media (max-width: 1024px) {
    height: 100dvh;
  }
`;

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const closeSidebar = () => setIsSidebarOpen(false);

  const isAdmin = user?.roles?.includes('admin');
  const canOpenSettings = isAdmin || user?.permissions?.includes('kanban.manage');

  return (
    <LayoutWrapper>
      <SidebarOverlay show={isSidebarOpen} onClick={closeSidebar} aria-label="Close navigation" />
      <Sidebar open={isSidebarOpen} $collapsed={isCollapsed}>
        <SidebarTop $collapsed={isCollapsed}>
          {!isCollapsed && (
            <Brand $collapsed={isCollapsed}>
              <BrandLogo>WP</BrandLogo>
              <span>WorkPilot</span>
            </Brand>
          )}
          <CollapseIconButton
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </CollapseIconButton>
        </SidebarTop>

        <Navigation>
          <StyledNavLink
            to="/"
            end
            $collapsed={isCollapsed}
          >
            <ListTodo size={18} />
            <span className="nav-label">Tasks</span>
          </StyledNavLink>
          <StyledNavLink
            to="/calendar"
            $collapsed={isCollapsed}
          >
            <CalendarDays size={18} />
            <span className="nav-label">Calendar</span>
          </StyledNavLink>
          {isAdmin && (
              <StyledNavLink
                to="/admin"
                $collapsed={isCollapsed}
              >
                <LayoutDashboard size={18} />
                <span className="nav-label">Dashboard</span>
              </StyledNavLink>
          )}
          {canOpenSettings && (
              <StyledNavLink
                to="/settings"
                $collapsed={isCollapsed}
              >
                <SettingsIcon size={18} />
                <span className="nav-label">Settings</span>
              </StyledNavLink>
          )}
        </Navigation>

        <SidebarFooter>
          <UserControls>
            {!isCollapsed && (
              <UserMeta>
                <span>{user?.fullName || '—'}</span>
                <span>{user?.email}</span>
              </UserMeta>
            )}
            <LogoutButton onClick={logout} $collapsed={isCollapsed}>
              <LogOut size={16} />
              <span className="label">Logout</span>
            </LogoutButton>
          </UserControls>
        </SidebarFooter>
      </Sidebar>

      <ContentArea onClick={closeSidebar}>
        <MobileHeader>
          <Brand>
            <BrandLogo>WP</BrandLogo>
            <span>WorkPilot</span>
          </Brand>
          <MobileMenuButton onClick={() => setIsSidebarOpen((prev) => !prev)}>
            ☰
          </MobileMenuButton>
        </MobileHeader>
        <Outlet />
      </ContentArea>
    </LayoutWrapper>
  );
};

export default DashboardLayout;

