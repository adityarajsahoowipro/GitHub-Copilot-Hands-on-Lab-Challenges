import { useCallback, useState } from 'react';

// Provides a small confirm() replacement backed by a rendered dialog rather than window.confirm.
export function useConfirm() {
  const [state, setState] = useState(null); // { message, resolve }

  const confirm = useCallback(
    (message) =>
      new Promise((resolve) => {
        setState({ message, resolve });
      }),
    []
  );

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  return { confirmState: state, confirm, handleConfirm, handleCancel };
}
