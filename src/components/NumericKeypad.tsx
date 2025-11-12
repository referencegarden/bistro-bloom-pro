import { Button } from "@/components/ui/button";
import { Delete } from "lucide-react";

interface NumericKeypadProps {
  onDigitPress: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export function NumericKeypad({ onDigitPress, onBackspace, onClear, disabled }: NumericKeypadProps) {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-sm mx-auto">
      {digits.map((digit) => (
        <Button
          key={digit}
          type="button"
          variant="outline"
          size="lg"
          className="h-16 text-2xl font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
          onClick={() => onDigitPress(digit)}
          disabled={disabled}
        >
          {digit}
        </Button>
      ))}
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-16 text-lg font-semibold hover:bg-destructive hover:text-destructive-foreground transition-colors"
        onClick={onClear}
        disabled={disabled}
      >
        C
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-16 text-2xl font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
        onClick={() => onDigitPress('0')}
        disabled={disabled}
      >
        0
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-16 hover:bg-secondary hover:text-secondary-foreground transition-colors"
        onClick={onBackspace}
        disabled={disabled}
      >
        <Delete className="h-6 w-6" />
      </Button>
    </div>
  );
}
