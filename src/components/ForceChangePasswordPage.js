import React, { useState } from 'react';
import styled from 'styled-components';
import { useForm } from 'react-hook-form';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { InlineLoader } from './AppLoader';
import ThemeToggle from './ThemeToggle';
import { KeyRound, LogOut } from 'lucide-react';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--wp-bg);
  padding: 24px;
  position: relative;
`;

const TopBar = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  align-items: center;
`;

const Card = styled.div`
  background: var(--wp-surface);
  border-radius: var(--wp-radius-lg);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
  padding: 40px;
  width: 100%;
  max-width: 420px;
  border: 1px solid var(--wp-border);
`;

const IconWrap = styled.div`
  width: 48px;
  height: 48px;
  border-radius: var(--wp-radius-lg);
  background: var(--wp-primary-muted);
  color: var(--wp-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
`;

const Header = styled.div`
  margin-bottom: 24px;

  h1 {
    font-size: 22px;
    font-weight: 700;
    color: var(--wp-text);
    margin: 0 0 8px;
    letter-spacing: -0.3px;
  }

  p {
    color: var(--wp-text-muted);
    font-size: 14px;
    margin: 0;
    line-height: 1.5;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-weight: 500;
  color: var(--wp-text);
  font-size: 13px;
`;

const Input = styled.input`
  padding: 11px 14px;
  border: 1px solid var(--wp-border);
  border-radius: 8px;
  font-size: 15px;
  background: var(--wp-surface);
  color: var(--wp-text);

  &:focus {
    outline: none;
    border-color: var(--wp-primary);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }

  ${(p) =>
    p.$error &&
    `
    border-color: var(--wp-error);
  `}
`;

const ErrorMessage = styled.span`
  color: var(--wp-error);
  font-size: 12px;
`;

const Button = styled.button`
  background: var(--wp-primary);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    background: var(--wp-primary-hover);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LogoutBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--wp-border);
  background: var(--wp-surface);
  color: var(--wp-text-muted);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: var(--wp-surface-2);
    color: var(--wp-text);
  }
`;

export default function ForceChangePasswordPage({ onComplete }) {
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const newPassword = watch('newPassword');

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await authAPI.changePassword({ newPassword: data.newPassword });
      localStorage.setItem('user', JSON.stringify(response.data.user));
      toast.success('Password updated. Welcome to WorkPilot!');
      onComplete(response.data.user);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <TopBar>
        <LogoutBtn type="button" onClick={logout}>
          <LogOut size={14} />
          Sign out
        </LogoutBtn>
        <ThemeToggle compact />
      </TopBar>
      <Card>
        <IconWrap aria-hidden>
          <KeyRound size={22} />
        </IconWrap>
        <Header>
          <h1>Set your password</h1>
          <p>
            {user?.firstName ? `${user.firstName}, your` : 'Your'} account was created by an
            administrator. Choose a new password to continue.
          </p>
        </Header>

        <Form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormGroup>
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              $error={errors.newPassword}
              {...register('newPassword', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
              })}
            />
            {errors.newPassword && (
              <ErrorMessage role="alert">{errors.newPassword.message}</ErrorMessage>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              $error={errors.confirmPassword}
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) => value === newPassword || 'Passwords do not match',
              })}
            />
            {errors.confirmPassword && (
              <ErrorMessage role="alert">{errors.confirmPassword.message}</ErrorMessage>
            )}
          </FormGroup>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? <InlineLoader message="Saving…" /> : 'Save and continue'}
          </Button>
        </Form>
      </Card>
    </Container>
  );
}
