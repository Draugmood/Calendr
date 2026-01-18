import { useEffect, useState } from "react";

interface Props {
  align?: "left" | "center" | "right";
}

export default function Clock({ align = "right" }: Props) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={
        `text-2xl font-bold text-gray-800 dark:text-gray-200` +
        (align === "left"
          ? " text-left"
          : align === "center"
          ? " text-center"
          : " text-right")
      }
    >
      {time.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })}
    </div>
  );
}
