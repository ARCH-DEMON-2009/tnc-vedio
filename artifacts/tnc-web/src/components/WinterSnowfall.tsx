const flakes = [
  { left: 4, delay: 5, duration: 18, size: 12 },
  { left: 13, delay: 13, duration: 24, size: 16 },
  { left: 21, delay: 2, duration: 21, size: 10 },
  { left: 31, delay: 9, duration: 26, size: 14 },
  { left: 42, delay: 17, duration: 20, size: 11 },
  { left: 53, delay: 1, duration: 25, size: 15 },
  { left: 64, delay: 12, duration: 19, size: 10 },
  { left: 73, delay: 7, duration: 23, size: 13 },
  { left: 84, delay: 15, duration: 21, size: 16 },
  { left: 94, delay: 4, duration: 27, size: 11 },
];

export default function WinterSnowfall() {
  return (
    <div className="winter-snowfall" aria-hidden="true">
      {flakes.map((flake, index) => (
        <span
          key={index}
          className="winter-snowfall__flake"
          style={{
            left: `${flake.left}%`,
            animationDelay: `-${flake.delay}s`,
            animationDuration: `${flake.duration}s`,
            fontSize: `${flake.size}px`,
          }}
        >
          ❄
        </span>
      ))}
    </div>
  );
}