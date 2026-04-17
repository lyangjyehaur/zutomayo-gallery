export default function Marquee({ items }: { items: string[] }) {
  return (
    <div className="relative flex w-full overflow-x-hidden text-black font-bold text-sm">
      <div className="animate-marquee whitespace-nowrap py-2 flex items-center">
        {items.map((item, idx) => {
          return (
            <span key={`a-${idx}`} className="mx-4 flex items-center gap-8">
              {item}
              <span className="opacity-50">✦</span>
            </span>
          )
        })}
      </div>

      <div className="absolute top-0 animate-marquee2 whitespace-nowrap py-2 flex items-center">
        {items.map((item, idx) => {
          return (
            <span key={`b-${idx}`} className="mx-4 flex items-center gap-8">
              {item}
              <span className="opacity-50">✦</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
