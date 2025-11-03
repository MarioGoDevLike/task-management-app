import React, { useState } from 'react';
import styled from 'styled-components';
import { useForm } from 'react-hook-form';
import { authAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const LoginContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #334155 50%, #475569 75%, #64748b 100%);
  padding: 20px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.15) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
    animation: gradientShift 8s ease-in-out infinite;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.03)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.03)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.02)"/><circle cx="10" cy="60" r="0.5" fill="rgba(255,255,255,0.02)"/><circle cx="90" cy="40" r="0.5" fill="rgba(255,255,255,0.02)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
    opacity: 0.6;
  }

  @keyframes gradientShift {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
`;

const LoginCard = styled.div`
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(30px);
  border-radius: 32px;
  box-shadow: 
    0 40px 80px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(59, 130, 246, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 8px 32px rgba(0, 0, 0, 0.2);
  padding: 56px 48px;
  width: 100%;
  max-width: 480px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(59, 130, 246, 0.3);
  animation: cardFloat 6s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6px;
    background: linear-gradient(90deg, #3b82f6, #10b981, #8b5cf6, #f59e0b, #ef4444);
    border-radius: 32px 32px 0 0;
  }

  &::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
    animation: float 8s ease-in-out infinite;
  }

  @keyframes cardFloat {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(180deg); }
  }
`;

const Logo = styled.div`
  text-align: center;
  margin-bottom: 30px;
`;

const LogoIcon = styled.div`
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #3b82f6, #10b981, #8b5cf6, #f59e0b, #ef4444);
  border-radius: 50%;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  color: white;
  font-weight: 800;
  box-shadow: 
    0 12px 40px rgba(59, 130, 246, 0.4),
    0 4px 16px rgba(16, 185, 129, 0.3),
    inset 0 2px 0 rgba(255, 255, 255, 0.3);
  animation: logoPulse 3s ease-in-out infinite;
  position: relative;
  z-index: 1;
  border: 3px solid rgba(59, 130, 246, 0.3);

  @keyframes logoPulse {
    0%, 100% { 
      transform: scale(1);
      box-shadow: 
        0 12px 40px rgba(59, 130, 246, 0.4),
        0 4px 16px rgba(16, 185, 129, 0.3),
        inset 0 2px 0 rgba(255, 255, 255, 0.3);
    }
    50% { 
      transform: scale(1.08);
      box-shadow: 
        0 16px 48px rgba(59, 130, 246, 0.5),
        0 8px 24px rgba(16, 185, 129, 0.4),
        inset 0 2px 0 rgba(255, 255, 255, 0.4);
    }
  }

  &::before {
    content: '';
    position: absolute;
    top: -6px;
    left: -6px;
    right: -6px;
    bottom: -6px;
    background: linear-gradient(135deg, #3b82f6, #10b981, #8b5cf6, #f59e0b, #ef4444);
    border-radius: 50%;
    z-index: -1;
    opacity: 0.2;
    animation: rotate 4s linear infinite;
  }

  &::after {
    content: '';
    position: absolute;
    top: -12px;
    left: -12px;
    right: -12px;
    bottom: -12px;
    background: linear-gradient(135deg, #3b82f6, #10b981, #8b5cf6, #f59e0b, #ef4444);
    border-radius: 50%;
    z-index: -2;
    opacity: 0.1;
    animation: rotate 6s linear infinite reverse;
  }

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const Title = styled.h1`
  font-size: 36px;
  font-weight: 900;
  background: linear-gradient(135deg, #3b82f6, #10b981, #8b5cf6, #f59e0b, #ef4444);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  text-align: center;
  position: relative;
  z-index: 1;
  letter-spacing: -0.5px;
  line-height: 1.2;
`;

const Subtitle = styled.p`
  color: #94a3b8;
  font-size: 18px;
  margin: 16px 0 0;
  text-align: center;
  position: relative;
  z-index: 1;
  font-weight: 500;
  line-height: 1.4;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 8px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
`;

const Label = styled.label`
  font-weight: 700;
  color: #f1f5f9;
  font-size: 15px;
  letter-spacing: 0.2px;
  position: relative;
  z-index: 1;
  text-align: left;
`;

const Input = styled.input`
  padding: 18px 24px;
  border: 2px solid rgba(71, 85, 105, 0.6);
  border-radius: 20px;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(15px);
  position: relative;
  z-index: 1;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  color: #f1f5f9;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: rgba(30, 41, 59, 0.9);
    box-shadow: 
      0 0 0 4px rgba(59, 130, 246, 0.2),
      0 12px 40px rgba(59, 130, 246, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    transform: translateY(-3px);
  }

  &:hover {
    border-color: rgba(59, 130, 246, 0.6);
    background: rgba(30, 41, 59, 0.85);
    transform: translateY(-2px);
    box-shadow: 
      0 4px 16px rgba(59, 130, 246, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }

  &::placeholder {
    color: #64748b;
    font-weight: 500;
    font-size: 15px;
  }

  ${props => props.error && `
    border-color: #ef4444;
    background: rgba(30, 41, 59, 0.9);
    box-shadow: 
      0 0 0 4px rgba(239, 68, 68, 0.2),
      0 4px 16px rgba(239, 68, 68, 0.1);
  `}
`;

const ErrorMessage = styled.span`
  color: #ef4444;
  font-size: 14px;
  font-weight: 600;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: '⚠';
    font-size: 12px;
  }
`;

const Button = styled.button`
  background: linear-gradient(135deg, #3b82f6, #10b981, #8b5cf6, #f59e0b, #ef4444);
  color: white;
  border: none;
  padding: 20px 32px;
  border-radius: 20px;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: 24px;
  position: relative;
  z-index: 1;
  box-shadow: 
    0 12px 40px rgba(59, 130, 246, 0.4),
    0 4px 16px rgba(16, 185, 129, 0.3),
    inset 0 2px 0 rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  border: 2px solid rgba(59, 130, 246, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-4px);
    box-shadow: 
      0 20px 60px rgba(59, 130, 246, 0.5),
      0 8px 24px rgba(16, 185, 129, 0.4),
      inset 0 2px 0 rgba(255, 255, 255, 0.4);
    background: linear-gradient(135deg, #2563eb, #059669, #7c3aed, #d97706, #dc2626);
  }

  &:active:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 
      0 8px 32px rgba(59, 130, 246, 0.4),
      0 4px 16px rgba(16, 185, 129, 0.3),
      inset 0 2px 0 rgba(255, 255, 255, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, #3b82f6, #10b981, #8b5cf6, #f59e0b, #ef4444);
    border-radius: 20px;
    z-index: -1;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover:not(:disabled)::before {
    opacity: 1;
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 32px 0;
  position: relative;
  z-index: 1;
  
  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 2px;
    background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
  }
  
  span {
    padding: 0 20px;
    color: #64748b;
    font-size: 14px;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 20px;
    backdrop-filter: blur(10px);
  }
`;

const LinkButton = styled.button`
  background: none;
  border: none;
  color: #667eea;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  padding: 16px 28px;
  margin-top: 32px;
  border-radius: 16px;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
  border: 2px solid rgba(102, 126, 234, 0.2);
  background: rgba(102, 126, 234, 0.05);

  &:hover {
    color: #5a67d8;
    background: rgba(102, 126, 234, 0.1);
    transform: translateY(-2px);
    border-color: rgba(102, 126, 234, 0.3);
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
  }

  &:active {
    transform: translateY(0);
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #ffffff;
  animation: spin 1s ease-in-out infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const LoginPage = ({ onLogin, onSwitchToRegister }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await authAPI.login(data);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      toast.success('Login successful!');
      onLogin(user);
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Logo>
          <LogoIcon>✓</LogoIcon>
          <Title>Welcome Back</Title>
          <Subtitle>Sign in to your account</Subtitle>
        </Logo>

        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: 'Invalid email address'
                }
              })}
              error={errors.email}
            />
            {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters'
                }
              })}
              error={errors.password}
            />
            {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
          </FormGroup>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? <LoadingSpinner /> : 'Sign In'}
          </Button>
        </Form>

      </LoginCard>
    </LoginContainer>
  );
};

export default LoginPage;
