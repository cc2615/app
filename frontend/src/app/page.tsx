import Head from 'next/head';

export default function Page() {
  const items = [
    { label: "Chat", shortcut: "Ctrl" },
    { label: "Ask AI", shortcut: "Ctrl" },
    { label: "Refactor", shortcut: "Ctrl" },
    { label: "ShowHelp", shortcut: "Ctrl" },
    { label: "(0000)", shortcut: null },
  ];

  return (
    <>
      <Head>
          <title></title>
      </Head>
      <div
        className="w-[580px] h-[34px] flex items-center justify-between px-3 
                  bg-neutral-800/90 backdrop-blur-md rounded-full text-white font-sans select-none"
      >
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center space-x-2 px-3 py-1 rounded-md bg-neutral-700/60 hover:bg-neutral-600/80 transition"
          >
            <span className="text-sm">{item.label}</span>
            {item.shortcut && (
              <kbd className="text-xs px-1 py-0.5 bg-black/30 rounded font-mono">
                {item.shortcut}
              </kbd>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
