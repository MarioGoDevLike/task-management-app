import React, { useState } from 'react';
import styled from 'styled-components';
import { useForm } from 'react-hook-form';
import { authAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { InlineLoader } from './AppLoader';
import ThemeToggle from './ThemeToggle';

const Container = styled.div`
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(380px, 1fr) minmax(420px, 560px);
  background: var(--wp-bg);

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const BrandPanel = styled.aside`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 40px 48px;
  overflow: hidden;
  background-color: #15181d;
  /* Blueprint grid: fine 16px lines with a stronger 80px major grid. */
  background-image:
    linear-gradient(rgba(106, 161, 255, 0.09) 1px, transparent 1px),
    linear-gradient(90deg, rgba(106, 161, 255, 0.09) 1px, transparent 1px),
    linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
  background-size: 80px 80px, 80px 80px, 16px 16px, 16px 16px;
  color: #aab2bf;

  @media (max-width: 900px) {
    display: none;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #f1f3f6;
    font-weight: 700;
    font-size: 15px;
  }

  h2 {
    margin: 0 0 12px;
    max-width: 440px;
    font-size: 30px;
    line-height: 1.2;
    font-weight: 600;
    color: #f1f3f6;
  }

  p {
    margin: 0;
    max-width: 420px;
    font-size: 14px;
    line-height: 1.6;
  }

  ul {
    margin: 28px 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 10px;
    font-size: 13px;
  }

  li {
    display: flex;
    align-items: center;
    gap: 10px;

    &::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 1px;
      background: #6aa1ff;
    }
  }

  .foot {
    font-size: 12px;
    color: #737c89;
  }
`;

const LogoMark = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: var(--wp-primary);
  color: #fff;
  display: grid;
  place-items: center;
  font-family: var(--wp-font-mono);
  font-weight: 700;
  font-size: 13px;
`;

const FormPanel = styled.main`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
  background: var(--wp-surface);
  border-left: 1px solid var(--wp-border);

  @media (max-width: 900px) {
    border-left: none;
    background: var(--wp-bg);
    padding: 32px 20px;
  }
`;

const TopBar = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
`;

const FormInner = styled.div`
  width: 100%;
  max-width: 360px;

  .mobile-brand {
    display: none;
    margin-bottom: 24px;

    @media (max-width: 900px) {
      display: block;
    }
  }

  h1 {
    margin: 0 0 6px;
    font-size: 22px;
    font-weight: 600;
    color: var(--wp-text);
  }

  .lead {
    margin: 0 0 28px;
    font-size: 14px;
    color: var(--wp-text-muted);
  }

  .help {
    margin: 20px 0 0;
    font-size: 12px;
    color: var(--wp-text-subtle);
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  height: 40px;
  padding: 0 12px;
  border: 1px solid ${(p) => (p.$error ? 'var(--wp-error)' : 'var(--wp-input-border)')};
  border-radius: var(--wp-radius);
  font-size: 14px;
  background: var(--wp-input-bg);
  color: var(--wp-text);

  &:focus {
    outline: none;
    border-color: ${(p) => (p.$error ? 'var(--wp-error)' : 'var(--wp-primary)')};
    box-shadow: 0 0 0 3px ${(p) => (p.$error ? 'var(--wp-error-bg)' : 'var(--wp-focus-ring)')};
  }

  &::placeholder {
    color: var(--wp-input-placeholder);
  }
`;

const ErrorMessage = styled.span`
  color: var(--wp-error);
  font-size: 12px;
`;

const Button = styled.button`
  height: 40px;
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--wp-primary);
  border-radius: var(--wp-radius);
  background: var(--wp-primary);
  color: var(--wp-on-primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: var(--wp-primary-hover);
    border-color: var(--wp-primary-hover);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

const LoginPage = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await authAPI.login(data);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      toast.success('Welcome back!');
      onLogin(user);
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <BrandPanel aria-hidden>
        <div className="brand">
          <LogoMark>WP</LogoMark>
          WorkPilot
        </div>
        <div>
          <h2>Engineering work, planned and delivered.</h2>
          <p>One place for project boards, deadlines and team assignments.</p>
          <ul>
            <li>Project boards with drag-and-drop workflow</li>
            <li>Due dates, priorities and overdue tracking</li>
            <li>Role-based access for teams and admins</li>
          </ul>
        </div>
        <div className="foot">© {new Date().getFullYear()} WorkPilot</div>
      </BrandPanel>

      <FormPanel>
        <TopBar>
          <ThemeToggle compact />
        </TopBar>
        <FormInner>
          <div className="mobile-brand">
            <LogoMark aria-hidden>WP</LogoMark>
          </div>
          <h1>Sign in</h1>
          <p className="lead">Use your company account to access the workspace.</p>

          <Form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FormGroup>
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="name@company.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' },
                })}
                $error={errors.email}
              />
              {errors.email && <ErrorMessage id="email-error" role="alert">{errors.email.message}</ErrorMessage>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...register('password', { required: 'Password is required' })}
                $error={errors.password}
              />
              {errors.password && <ErrorMessage id="password-error" role="alert">{errors.password.message}</ErrorMessage>}
            </FormGroup>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? <InlineLoader message="Signing in" /> : 'Sign in'}
            </Button>
          </Form>
          <p className="help">Need access? Ask your workspace administrator for an account.</p>
        </FormInner>
      </FormPanel>
    </Container>
  );
};

export default LoginPage;
