const solid = { fill: 'currentColor', stroke: 'none' }

const icons = {
  play: <path {...solid} d="M8 4.8v14.4a1 1 0 0 0 1.5.86l11.6-7.2a1 1 0 0 0 0-1.72L9.5 3.94A1 1 0 0 0 8 4.8z" />,
  pause: (
    <g {...solid}>
      <rect x="6" y="4.5" width="4" height="15" rx="1.2" />
      <rect x="14" y="4.5" width="4" height="15" rx="1.2" />
    </g>
  ),
  prev: (
    <g>
      <path {...solid} d="M18 6.2v11.6a.8.8 0 0 1-1.25.66L9 13.1v-2.2l7.75-5.36A.8.8 0 0 1 18 6.2z" />
      <path d="M6.5 6v12" />
    </g>
  ),
  next: (
    <g>
      <path {...solid} d="M6 6.2v11.6a.8.8 0 0 0 1.25.66L15 13.1v-2.2L7.25 5.54A.8.8 0 0 0 6 6.2z" />
      <path d="M17.5 6v12" />
    </g>
  ),
  stop: <rect {...solid} x="6" y="6" width="12" height="12" rx="2.5" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  sound: <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />,
  mute: <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5zM16 9.5l5 5M21 9.5l-5 5" />,
  voice: <path d="M12 3.5a3 3 0 0 0-3 3V12a3 3 0 0 0 6 0V6.5a3 3 0 0 0-3-3zM5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" />,
  history: <path d="M12 3a9 9 0 1 1-8.5 6M3 4v5h5M12 7.5V12l3 2" />,
  help: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.6 9.3a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.6M12 17h.01" />,
  edit: <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16zM13.5 6.5l4 4" />,
  plus: <path d="M12 5v14M5 12h14" />,
  undo: <path d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  music: <path d="M9 18V5.5l11-2V16M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM9 9.5l11-2" />,
  list: <path d="M4 6h11M4 12h11M4 18h7M17 18V9l4 1.5M17 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />,
  link: <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />,
  minimize: <path d="M6 9l6 6 6-6" />,
  left: <path d="M15 6l-6 6 6 6" />,
  right: <path d="M9 6l6 6-6 6" />,
  search: <path d="M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20.5 20.5l-5-5" />,
  calendar: <path d="M5 5.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1zM4 10h16M8.5 3.5v4M15.5 3.5v4" />,
  minus: <path d="M5 12h14" />,
  options: <path d="M4 7h9M17 7h3M4 17h3M11 17h9M15 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM9 19.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />,
  copy: <path d="M9 9h10v10H9zM15 9V5H5v10h4" />,
  figure: (
    <g>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M12 8.5v6M12 14.5l-3.5 6M12 14.5l3.5 6M6.5 11l5.5-1.5 5.5 1.5" />
    </g>
  ),
  grip: (
    <g {...solid}>
      {[6, 12, 18].flatMap((y) => [9, 15].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.5" />))}
    </g>
  ),
}

export type IconName = keyof typeof icons

export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {icons[name]}
    </svg>
  )
}
