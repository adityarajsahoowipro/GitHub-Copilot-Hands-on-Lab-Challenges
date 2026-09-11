import { render, screen } from '@testing-library/react';
import SeverityBadge from '../SeverityBadge.jsx';

describe('SeverityBadge', () => {
  it('renders the severity label for P1', () => {
    render(<SeverityBadge severity="P1" />);
    expect(screen.getByText(/P1 - Critical/i)).toBeInTheDocument();
  });

  it('renders the severity label for P3', () => {
    render(<SeverityBadge severity="P3" />);
    expect(screen.getByText(/P3 - Medium/i)).toBeInTheDocument();
  });
});
