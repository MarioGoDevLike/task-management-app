import React from 'react';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
`;

const Center = styled.div`
  min-height: ${(p) => p.$minHeight || '100vh'};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: ${(p) => p.$background || '#f8fafc'};
`;

const Card = styled.div`
  width: 100%;
  max-width: 360px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
`;

const SpinnerShell = styled.div`
  width: ${(p) => p.$size || 42}px;
  height: ${(p) => p.$size || 42}px;
  margin: 0 auto 14px;
  border-radius: 50%;
  border: ${(p) => (p.$size && p.$size <= 20 ? 2 : 3)}px solid rgba(59, 130, 246, 0.16);
  border-top-color: #2563eb;
  animation: ${spin} 0.75s linear infinite;
`;

const Message = styled.p`
  margin: 0;
  color: #475569;
  font-size: ${(p) => (p.$compact ? '13px' : '14px')};
  font-weight: 600;
  letter-spacing: 0.1px;
`;

const Dots = styled.span`
  display: inline-block;
  min-width: 22px;
  text-align: left;
  animation: ${pulse} 1.2s ease-in-out infinite;
`;

export function FullPageLoader({ message = 'Loading workspace' }) {
  return (
    <Center>
      <Card>
        <SpinnerShell />
        <Message>
          {message}
          <Dots>...</Dots>
        </Message>
      </Card>
    </Center>
  );
}

export function SectionLoader({ message = 'Loading data', minHeight = '280px' }) {
  return (
    <Center $minHeight={minHeight} $background="transparent">
      <Card style={{ maxWidth: 300, boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)' }}>
        <SpinnerShell $size={34} />
        <Message>{message}</Message>
      </Card>
    </Center>
  );
}

export function InlineLoader({ message = 'Loading' }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <SpinnerShell $size={16} style={{ margin: 0 }} />
      <Message $compact>{message}</Message>
    </div>
  );
}

