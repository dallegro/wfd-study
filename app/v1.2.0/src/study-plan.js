export function isValidGoal(goal, total) {
  return Number.isInteger(goal) && goal >= 1 && goal <= total;
}

export function getDayCount(goal, total) {
  return Math.ceil(total / goal);
}

export function getDayRange(day, goal, total) {
  const first = day * goal;
  return { first, last: Math.min(first + goal, total) - 1 };
}

export function getResumeIndex(savedPosition, total) {
  const index = savedPosition?.index;
  return Number.isInteger(index) && index >= 0 && index < total ? index : 0;
}
