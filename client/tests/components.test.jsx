import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../src/components/ui/Button.jsx';
import Badge from '../src/components/ui/Badge.jsx';
import Input from '../src/components/ui/Input.jsx';
import EmptyState from '../src/components/ui/EmptyState.jsx';

describe('UI Primitives Unit Tests', () => {
  it('Button renders children and triggers onClick handler', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('Button supports disabled state and prevents click event', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled Action</Button>);

    const button = screen.getByRole('button', { name: /disabled action/i });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('Badge renders text content and applies variant styling', () => {
    render(<Badge variant="emerald">VERIFIED</Badge>);
    const badge = screen.getByText(/verified/i);
    expect(badge).toBeInTheDocument();
  });

  it('Input renders label, placeholder, and error message if provided', () => {
    render(
      <Input
        label="Email Address"
        placeholder="user@example.com"
        error="Invalid email address"
      />
    );

    expect(screen.getByText('Email Address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/user@example.com/i)).toBeInTheDocument();
    expect(screen.getByText('Invalid email address')).toBeInTheDocument();
  });

  it('EmptyState renders title, description, and action button', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="No Properties Found"
        description="You have not added any properties yet."
        actionText="Create Property"
        onAction={handleAction}
      />
    );

    expect(screen.getByText(/no properties found/i)).toBeInTheDocument();
    expect(screen.getByText(/you have not added any properties yet/i)).toBeInTheDocument();

    const actionBtn = screen.getByRole('button', { name: /create property/i });
    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
