import React, { useState } from 'react';
import styled from 'styled-components';
import { useForm } from 'react-hook-form';
import { authAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafbfc;
  padding: 24px;
`;

const Card = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03), 0 2px 4px rgba(0, 0, 0, 0.03);
  padding: 48px;
  width: 100%;
  max-width: 420px;
  border: 1px solid #e8ecf0;
`;

const Logo = styled.div`
  margin-bottom: 32px;
  
  h1 {
    font-size: 28px;
    font-weight: 600;
    color: #0f172a;
    margin: 0 0 8px 0;
    }
  
  p {
    color: #64748b;
    font-size: 14px;
    margin: 0;
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
`;

const Label = styled.label`
  font-weight: 500;
  color: #334155;
  font-size: 14px;
`;

const Input = styled.input`
  padding: 14px 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  font-size: 15px;
  transition: all 0.15s ease;
  background: #fafbfc;
  color: #0f172a;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08);
  }

  &:hover {
    border-color: #cbd5e1;
  }

  &::placeholder {
    color: #94a3b8;
  }

  ${props => props.error && `
    border-color: #ef4444;
    background: #fef2f2;
    
    &:focus {
      box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.08);
    }
  `}
`;

const ErrorMessage = styled.span`
  color: #ef4444;
  font-size: 13px;
  margin-top: -4px;
`;

const Button = styled.button`
  background: #3b82f6;
  color: white;
  border: none;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-top: 8px;

  &:hover:not(:disabled) {
    background: #2563eb;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
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
      <Card>
        <Logo>
          <h1>Task Manager</h1>
          <p>Sign in to continue</p>
        </Logo>

        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
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
                required: 'Password is required'
              })}
              error={errors.password}
            />
            {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
          </FormGroup>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? <LoadingSpinner /> : 'Sign In'}
          </Button>
        </Form>
      </Card>
    </Container>
  );
};

export default LoginPage;
