import { useCallback, useEffect, useState } from 'react';

const useApiResource = (loader, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const nextData = await loader();
      setData(nextData);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    data,
    loading,
    error,
    reload,
    setData,
  };
};

export default useApiResource;
