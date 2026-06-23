type PlayerCardProps = {
  name: string
  isHost: boolean
}

export function PlayerCard({ name, isHost }: PlayerCardProps) {
  return (
    <article className="player-card">
      <span>{name}</span>
      {isHost && <span className="host-badge">Host</span>}
    </article>
  )
}
