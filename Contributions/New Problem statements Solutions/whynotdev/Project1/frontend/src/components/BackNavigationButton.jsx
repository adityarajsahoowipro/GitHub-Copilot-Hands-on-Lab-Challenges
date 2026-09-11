import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const fallbackByPath = {
  '/dashboard': '/',
  '/dashboard/incidents': '/dashboard',
  '/dashboard/incidents/new': '/dashboard/incidents',
  '/dashboard/related-incidents': '/dashboard',
};

function BackNavigationButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    let scrollTimer;
    const handleScroll = () => {
      setIsScrolling(true);
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => setIsScrolling(false), 450);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.clearTimeout(scrollTimer);
    };
  }, []);

  if (location.pathname === '/') return null;

  const fallback = location.pathname.endsWith('/rca')
    ? location.pathname.replace('/rca', '')
    : location.pathname.startsWith('/dashboard/incidents/')
      ? '/dashboard/incidents'
      : fallbackByPath[location.pathname] || '/dashboard';

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallback);
  };

  return <button aria-label="Go back" className={`back-navigation-button ${isScrolling ? 'is-scrolling' : ''}`} onClick={goBack} title="Go back" type="button"><ArrowLeft size={19} /></button>;
}

export default BackNavigationButton;
