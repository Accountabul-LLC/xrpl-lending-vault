export function AccountabulMark({ className }: { className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}accountabul-icon.png`}
      alt=""
      width={32}
      height={32}
      className={className}
    />
  )
}
