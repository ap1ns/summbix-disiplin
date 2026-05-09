/**
 * @file useGoalProgress.ts
 * @description Custom hook that computes the progress for each goal
 * based on associated tasks and habits. Extracted from App.tsx for
 * better modularity and reusability.
 */

import { useMemo } from 'react';
import { Goal, Task, Habit } from '../types';

/**
 * Computes the earned progress percentage for each goal.
 *
 * Algorithm:
 * 1. For each goal, iterate over each calendar day from start → today.
 * 2. Look up pre-grouped tasks for that specific date (O(1) lookup).
 * 3. Count completed tasks and habits for that day.
 * 4. Award the daily quota of progress proportionally.
 *
 * Time Complexity: O(G * D + T + H) instead of the naive O(G * D * (T + H))
 */
export function useGoalProgress(goals: Goal[], tasks: Task[], habits: Habit[]): Goal[] {
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    return goals.map((goal) => {
      const startDate = new Date(goal.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(goal.deadline);
      endDate.setHours(0, 0, 0, 0);

      const startTimestamp = startDate.getTime();
      const totalDays = Math.max(
        1,
        Math.floor((endDate.getTime() - startTimestamp) / MS_PER_DAY) + 1
      );
      const dailyProgressQuota = 100 / totalDays;

      // Pre-group tasks for this goal by date — avoids inner-loop re-scanning
      const goalTasks = tasks.filter((t) => t.goalId === goal.id);
      const tasksByDate = goalTasks.reduce<Record<string, Task[]>>((acc, task) => {
        const dateKey = task.date || goal.deadline;
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(task);
        return acc;
      }, {});

      const goalHabits = habits.filter((h) => h.goalId === goal.id);

      let earnedProgress = 0;

      for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
        const currentDate = new Date(startTimestamp + dayIndex * MS_PER_DAY);
        currentDate.setHours(0, 0, 0, 0);

        // Stop counting future days
        if (currentDate.getTime() > todayTimestamp) break;

        const currentDateStr = currentDate.toISOString().split('T')[0];
        const dayTasks = tasksByDate[currentDateStr] || [];
        const totalItemsForDay = dayTasks.length + goalHabits.length;

        if (totalItemsForDay === 0) {
          // Award full quota for days with no assigned items
          earnedProgress += dailyProgressQuota;
        } else {
          const completedTaskCount = dayTasks.filter((t) => t.completed).length;
          const completedHabitCount = goalHabits.filter((h) =>
            (h.completedDates || []).includes(currentDateStr)
          ).length;
          const completionRatio = (completedTaskCount + completedHabitCount) / totalItemsForDay;
          earnedProgress += completionRatio * dailyProgressQuota;
        }
      }

      return { ...goal, progress: Math.min(100, Math.round(earnedProgress)) };
    });
  }, [goals, tasks, habits]);
}
