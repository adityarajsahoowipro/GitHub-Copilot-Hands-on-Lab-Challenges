import { render, screen } from '@testing-library/react';
import StatusBadge from '../StatusBadge.jsx';

describe('StatusBadge', () => {
  it('renders a human-readable status label', () => {
    render(<StatusBadge status="INVESTIGATING" />);
    expect(screen.getByText('Investigating')).toBeInTheDocument();
  });
});
