type TrainerWithMembershipPoints = {
  trainedGroups: Array<{
    memberships: Array<{
      user: {
        id: string;
        role: string | null;
        points: number;
      };
    }>;
  }>;
};

export function getTrainerLeaderboardPoints(trainer: TrainerWithMembershipPoints) {
  const traineePoints = new Map<string, number>();

  for (const group of trainer.trainedGroups) {
    for (const membership of group.memberships) {
      if (membership.user.role !== "TRAINEE") {
        continue;
      }

      traineePoints.set(membership.user.id, membership.user.points);
    }
  }

  return [...traineePoints.values()].reduce((sum, value) => sum + value, 0);
}

