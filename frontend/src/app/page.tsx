export default function Page() {
  const items = [
    { label: "Chat", shortcut: "Ctrl" },
    { label: "Ask AI", shortcut: "Ctrl" },
    { label: "Restart", shortcut: "Ctrl + R" },
    { label: "Show/Hide", shortcut: "Ctrl + /" },
    { label: "00:00", shortcut: null },
  ];

  return (
    <div className="w-[580px] h-[50px] bg-black/50 border-[3px] border-black/10 border-solid rounded-[13px] text-white font-sans flex items-center justify-between px-2 select-none backdrop-blur-md">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="flex items-baseline gap-1 px-3 py-1 rounded-md bg-black/40 hover:bg-black/60 transition"
        >
          <span className="text-[13px] font-medium leading-tight">{item.label}</span>
          {item.shortcut && (
            <span className="text-[11px] text-white/60 font-mono leading-tight">
              {item.shortcut}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
