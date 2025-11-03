import React, { useState } from 'react';
import styled from 'styled-components';
import { useForm } from 'react-hook-form';
import { authAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const RegisterContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
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
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.05)"/><circle cx="10" cy="60" r="0.5" fill="rgba(255,255,255,0.05)"/><circle cx="90" cy="40" r="0.5" fill="rgba(255,255,255,0.05)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
    opacity: 0.3;
  }
`;

const RegisterCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow: 
    0 32px 64px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  padding: 48px;
  width: 100%;
  max-width: 480px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #667eea, #764ba2, #f093fb);
    border-radius: 24px 24px 0 0;
  }

  &::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%);
    animation: float 6s ease-in-out infinite;
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
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea, #764ba2, #f093fb);
  border-radius: 50%;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: white;
  font-weight: bold;
  box-shadow: 
    0 8px 32px rgba(102, 126, 234, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  animation: pulse 2s ease-in-out infinite;
  position: relative;
  z-index: 1;

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  &::before {
    content: '';
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    background: linear-gradient(135deg, #667eea, #764ba2, #f093fb);
    border-radius: 50%;
    z-index: -1;
    opacity: 0.3;
    animation: rotate 3s linear infinite;
  }

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea, #764ba2, #f093fb);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  text-align: center;
  position: relative;
  z-index: 1;
`;

const Subtitle = styled.p`
  color: #718096;
  font-size: 16px;
  margin: 12px 0 0;
  text-align: center;
  position: relative;
  z-index: 1;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-weight: 600;
  color: #2d3748;
  font-size: 14px;
`;

const Input = styled.input`
  padding: 16px 20px;
  border: 2px solid rgba(226, 232, 240, 0.8);
  border-radius: 16px;
  font-size: 16px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(247, 250, 252, 0.8);
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 1;

  &:focus {
    outline: none;
    border-color: #667eea;
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 
      0 0 0 4px rgba(102, 126, 234, 0.15),
      0 8px 32px rgba(102, 126, 234, 0.2);
    transform: translateY(-2px);
  }

  &:hover {
    border-color: rgba(102, 126, 234, 0.5);
    background: rgba(255, 255, 255, 0.9);
    transform: translateY(-1px);
  }

  &::placeholder {
    color: #a0aec0;
    font-weight: 500;
  }

  ${props => props.error && `
    border-color: #e53e3e;
    background: rgba(254, 215, 215, 0.8);
    box-shadow: 0 0 0 4px rgba(229, 62, 62, 0.15);
  `}
`;

const ErrorMessage = styled.span`
  color: #e53e3e;
  font-size: 14px;
  font-weight: 500;
`;

const Button = styled.button`
  background: linear-gradient(135deg, #667eea, #764ba2, #f093fb);
  color: white;
  border: none;
  padding: 16px 24px;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: 16px;
  position: relative;
  z-index: 1;
  box-shadow: 
    0 8px 32px rgba(102, 126, 234, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 
      0 16px 48px rgba(102, 126, 234, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
    background: linear-gradient(135deg, #5a67d8, #6b46c1, #ec4899);
  }

  &:active:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 
      0 8px 24px rgba(102, 126, 234, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, #667eea, #764ba2, #f093fb);
    border-radius: 16px;
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
  margin: 20px 0;
  
  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e2e8f0;
  }
  
  span {
    padding: 0 15px;
    color: #718096;
    font-size: 14px;
  }
`;

const LinkButton = styled.button`
  background: none;
  border: none;
  color: #667eea;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  padding: 12px 24px;
  margin-top: 24px;
  border-radius: 12px;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;

  &:hover {
    color: #764ba2;
    background: rgba(102, 126, 234, 0.1);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s ease-in-out infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const RegisterPage = ({ onRegister, onSwitchToLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, watch } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await authAPI.register(data);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      toast.success('Registration successful!');
      onRegister(user);
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RegisterContainer>
      <RegisterCard>
        <Logo>
          <LogoIcon>✓</LogoIcon>
          <Title>Create Account</Title>
          <Subtitle>Join us to get started</Subtitle>
        </Logo>

        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormRow>
            <FormGroup>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="John"
                {...register('firstName', {
                  required: 'First name is required',
                  minLength: {
                    value: 2,
                    message: 'First name must be at least 2 characters'
                  }
                })}
                error={errors.firstName}
              />
              {errors.firstName && <ErrorMessage>{errors.firstName.message}</ErrorMessage>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                {...register('lastName', {
                  required: 'Last name is required',
                  minLength: {
                    value: 2,
                    message: 'Last name must be at least 2 characters'
                  }
                })}
                error={errors.lastName}
              />
              {errors.lastName && <ErrorMessage>{errors.lastName.message}</ErrorMessage>}
            </FormGroup>
          </FormRow>

          <FormGroup>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
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
              placeholder="Create a password"
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

          <FormGroup>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: value => value === password || 'Passwords do not match'
              })}
              error={errors.confirmPassword}
            />
            {errors.confirmPassword && <ErrorMessage>{errors.confirmPassword.message}</ErrorMessage>}
          </FormGroup>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? <LoadingSpinner /> : 'Create Account'}
          </Button>
        </Form>

        <Divider>
          <span>or</span>
        </Divider>

        <LinkButton onClick={onSwitchToLogin}>
          Already have an account? Sign in
        </LinkButton>
      </RegisterCard>
    </RegisterContainer>
  );
};

export default RegisterPage;
