import type { Player, PlayerAnswer, RoundResult } from './types'

type RoundAssignment = {
  playerId: string
  question: string
  isImpostor: boolean
}

export function buildRoundResults(
  participants: readonly Player[],
  answers: readonly PlayerAnswer[],
  assignments: readonly RoundAssignment[],
): RoundResult[] {
  return participants.flatMap((player) => {
    const answer = answers.find((item) => item.playerId === player.id)
    const assignment = assignments.find((item) => item.playerId === player.id)

    return answer && assignment
      ? [{ ...answer, question: assignment.question, isImpostor: assignment.isImpostor }]
      : []
  })
}
