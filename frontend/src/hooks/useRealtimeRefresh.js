import { useEffect, useRef } from 'react';

const useRealtimeRefresh = ({ channels = [], onRefresh, enabled = true }) => {
  // Feature temporarily disabled to prevent infinite Axios fetch loops and UI blinking.
  useEffect(() => {}, []);
};

export default useRealtimeRefresh;
