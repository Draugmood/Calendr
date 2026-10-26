const WEATHER_ICON_BASE_URL =
  "https://cdn.jsdelivr.net/gh/metno/weathericons@latest/weather/svg";

export default function WeatherIcon({
  symbolCode,
  className = "h-16 w-16",
}: {
  symbolCode: string;
  className?: string;
}) {
  return (
    <img
      src={`${WEATHER_ICON_BASE_URL}/${symbolCode}.svg`}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`${className} select-none object-contain`}
    />
  );
}
