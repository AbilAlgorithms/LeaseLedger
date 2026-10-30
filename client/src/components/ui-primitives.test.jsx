import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Button from './ui/Button';
import Badge from './ui/Badge';

describe('UI Primitives Unit Tests', () => {
  test('Button renders children and variant classes correctly', () => {
    render(<Button variant="primary">Confirm Move-In</Button>);
    const btn = screen.getByRole('button', { name: /confirm move-in/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('bg-primary');
  });

  test('Badge displays status and label correctly', () => {
    render(<Badge variant="verified">Verified Mutual</Badge>);
    const badge = screen.getByText(/verified mutual/i);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('text-verified');
  });
});
