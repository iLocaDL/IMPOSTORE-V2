type LeaveRoomButtonProps = {
  onLeave: () => void
}

export function LeaveRoomButton({ onLeave }: LeaveRoomButtonProps) {
  return (
    <button type="button" className="leave-button" onClick={onLeave}>
      Abbandona
    </button>
  )
}
