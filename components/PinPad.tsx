"use client";

type Props = {
  value: string;
  onChange: (val: string) => void;
  maxLength?: number;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export default function PinPad({ value, onChange, maxLength = 6 }: Props) {
  function handleKey(key: string) {
    if (key === "⌫") {
      onChange(value.slice(0, -1));
    } else if (key !== "" && value.length < maxLength) {
      onChange(value + key);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* PIN dots */}
      <div className="flex gap-4">
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-colors ${
              i < value.length
                ? "bg-zinc-900 border-zinc-900"
                : "bg-transparent border-zinc-300"
            }`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {KEYS.map((key, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleKey(key)}
            disabled={key === ""}
            className={`h-16 rounded-2xl text-xl font-medium transition-colors select-none ${
              key === ""
                ? "invisible"
                : key === "⌫"
                ? "bg-zinc-100 text-zinc-500 active:bg-zinc-200"
                : "bg-white border border-zinc-200 text-zinc-900 active:bg-zinc-100 shadow-sm"
            }`}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}
