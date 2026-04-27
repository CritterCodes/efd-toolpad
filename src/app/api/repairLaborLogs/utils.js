export function calculateRepairLaborHours(repair = {}) {
  return (repair.tasks || []).reduce((sum, task) => {
    const quantity = Math.max(Number(task?.quantity) || 1, 1);
    const taskHours =
      Number(task?.pricing?.totalLaborHours)
      || Number(task?.laborHours)
      || 0;

    return sum + (taskHours * quantity);
  }, 0);
}

export function getLaborRateSnapshot(session) {
  return Number(session?.user?.employment?.hourlyRate) || 0;
}
