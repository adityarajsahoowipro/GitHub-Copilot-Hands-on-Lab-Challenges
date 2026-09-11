import { render, screen } from '@testing-library/react';
import SlaBadge from '../SlaBadge.jsx';

describe('SlaBadge', () => {
  it('renders the breached label', () => {
    render(<SlaBadge status="SLA_BREACHED" />);
    expect(screen.getByText(/SLA Breached/i)).toBeInTheDocument();
  });

  it('renders the within-SLA label', () => {
    render(<SlaBadge status="WITHIN_SLA" />);
    expect(screen.getByText(/Within SLA/i)).toBeInTheDocument();
  });
});
