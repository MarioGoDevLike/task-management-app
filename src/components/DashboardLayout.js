import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';

const LayoutWrapper = styled.div`
  min-height: 100vh;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
`;

const TopBar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  span {
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.3px;
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
  align-items: center;
  gap: 16px;

  @media (max-width: 768px) {
    display: none;
  }
`;

const StyledNavLink = styled(NavLink)`
  padding: 10px 18px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  color: #475569;
  text-decoration: none;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  &.active {
    color: #2563eb;
    border-color: #bfdbfe;
    background: #eff6ff;
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.12);
  }

  &:hover {
    color: #2563eb;
    background: rgba(37, 99, 235, 0.08);
  }
`;

const MobileMenuButton = styled.button`
  display: none;
  border: none;
  background: none;
  font-size: 24px;
  cursor: pointer;
  color: #475569;

  @media (max-width: 768px) {
    display: block;
  }
`;

const UserControls = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const UserMeta = styled.div`
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 2px;

  span:first-child {
    font-weight: 600;
    font-size: 14px;
    color: #0f172a;
  }

  span:last-child {
    font-size: 12px;
    color: #64748b;
  }

  @media (max-width: 640px) {
    display: none;
  }
`;

const LogoutButton = styled.button`
  padding: 10px 18px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(239, 68, 68, 0.25);
  }
`;

const MobileNav = styled.div`
  display: none;
  flex-direction: column;
  gap: 12px;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e2e8f0;

  a {
    font-size: 14px;
    font-weight: 600;
    color: #475569;
    text-decoration: none;
    padding: 12px 16px;
    border-radius: 12px;
    transition: all 0.15s ease;
    border: 1px solid transparent;
  }

  a.active {
    color: #2563eb;
    border-color: #bfdbfe;
    background: #eff6ff;
  }

  @media (max-width: 768px) {
    display: flex;
  }
`;

const ContentArea = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const closeMobileNav = () => setIsMobileNavOpen(false);

  const isAdmin = user?.roles?.includes('admin');

  return (
    <LayoutWrapper>
      <TopBar>
        <Brand>
          <BrandLogo>TM</BrandLogo>
          <span>Task Management</span>
        </Brand>
        <Navigation>
          <StyledNavLink to="/" end>
            Tasks
          </StyledNavLink>
          {isAdmin && (
            <>
              <StyledNavLink to="/admin">
                Dashboard
              </StyledNavLink>
              <StyledNavLink to="/settings">
                Settings
              </StyledNavLink>
            </>
          )}
        </Navigation>
        <UserControls>
          <UserMeta>
            <span>{user?.fullName || '—'}</span>
            <span>{user?.email}</span>
          </UserMeta>
          <LogoutButton onClick={logout}>Logout</LogoutButton>
          <MobileMenuButton onClick={() => setIsMobileNavOpen(prev => !prev)}>
            ☰
          </MobileMenuButton>
        </UserControls>
      </TopBar>
      {isMobileNavOpen && (
        <MobileNav>
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? 'active' : undefined)}
            onClick={closeMobileNav}
          >
            Tasks
          </NavLink>
          {isAdmin && (
            <>
              <NavLink
                to="/admin"
                className={({ isActive }) => (isActive ? 'active' : undefined)}
                onClick={closeMobileNav}
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) => (isActive ? 'active' : undefined)}
                onClick={closeMobileNav}
              >
                Settings
              </NavLink>
            </>
          )}
        </MobileNav>
      )}
      <ContentArea onClick={closeMobileNav}>
        <Outlet />
      </ContentArea>
    </LayoutWrapper>
  );
};

export default DashboardLayout;

