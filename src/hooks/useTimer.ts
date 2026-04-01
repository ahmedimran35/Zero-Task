import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../utils/api';
import type { Task } from '../types';

export function useTimer() {
  const { state, dispatch } = useAppContext();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!state.activeTimer) {
      setElapsed(0);
      return;
    }
    const startTime = new Date(state.activeTimer.startTime).getTime();
    const update = () => setElapsed(Math.round((Date.now() - startTime) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [state.activeTimer]);

  const startTimer = useCallback((task: Task) => {
    if (state.activeTimer) {
      // Stop current timer first
      stopTimer();
    }
    dispatch({ type: 'START_TIMER', payload: { taskId: task.id, taskTitle: task.title } });
  }, [state.activeTimer, dispatch]);

  const stopTimer = useCallback(() => {
    if (!state.activeTimer) return;
    const startTime = new Date(state.activeTimer.startTime).getTime();
    const duration = Math.round((Date.now() - startTime) / 1000);
    const task = state.tasks.find(t => t.id === state.activeTimer!.taskId);

    if (task) {
      const newLog = {
        id: crypto.randomUUID?.() || Date.now().toString(),
        startTime: state.activeTimer.startTime,
        endTime: new Date().toISOString(),
        duration,
      };
      const updatedTask = {
        ...task,
        timeLogs: [...task.timeLogs, newLog],
        updatedAt: new Date().toISOString(),
      };
      api.updateTask(updatedTask.id, updatedTask as unknown as Record<string, unknown>).catch(() => {});
      dispatch({
        type: 'ADD_TOAST',
        payload: {
          id: Date.now().toString(),
          message: `Logged ${formatDuration(duration)} on "${task.title}"`,
          type: 'success',
        },
      });
    }
    dispatch({ type: 'STOP_TIMER' });
  }, [state.activeTimer, state.tasks, dispatch]);

  const isTimerRunning = (taskId: string) => state.activeTimer?.taskId === taskId;

  return { elapsed, startTimer, stopTimer, isTimerRunning, activeTimer: state.activeTimer };
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}
