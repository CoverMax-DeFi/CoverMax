import React, { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

interface ActionCardProps {
  title: string;
  description: string;
  buttonText: string;
  isWithdraw?: boolean;
  isPercentage?: boolean;
  maxValue: number;
  onAction: ((amount: number) => void) | (() => void);
  disabled?: boolean;
}

const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  buttonText,
  isWithdraw = false,
  isPercentage = false,
  maxValue,
  onAction,
  disabled = false,
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [percentage, setPercentage] = useState<number>(0);

  const handleSliderChange = (value: number[]) => {
    const newValue = value[0];
    setPercentage(newValue);

    if (isPercentage) {
      setAmount(newValue);
    } else {
      setAmount((maxValue * newValue) / 100);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;

    if (isPercentage) {
      setAmount(Math.min(value, 100));
      setPercentage(Math.min(value, 100));
    } else {
      setAmount(Math.min(value, maxValue));
      setPercentage((value / maxValue) * 100);
    }
  };

  const handleMax = () => {
    setAmount(isPercentage ? 100 : maxValue);
    setPercentage(100);
  };

  const handleHalf = () => {
    setAmount(isPercentage ? 50 : maxValue / 2);
    setPercentage(50);
  };

  const handleAction = () => {
    // Try to call as a function with amount parameter first
    try {
      (onAction as (amount: number) => void)(amount);
    } catch {
      // If that fails, try calling as a function with no parameters
      (onAction as () => void)();
    }
    setAmount(0);
    setPercentage(0);
  };

  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow bg-slate-800/50 border-slate-700 backdrop-blur-sm">
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center space-x-2">
          <Input
            type="number"
            value={amount || ''}
            onChange={handleInputChange}
            placeholder={isPercentage ? "Percentage" : "Amount"}
            className="flex-1 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
            min={0}
            max={isPercentage ? 100 : maxValue}
            step={isPercentage ? 1 : 0.01}
          />
          <span className="text-sm font-medium text-slate-300">
            {isPercentage ? '%' : '$'}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-slate-400">0%</span>
            <span className="text-sm text-slate-400">50%</span>
            <span className="text-sm text-slate-400">100%</span>
          </div>
          <Slider
            value={[percentage]}
            max={100}
            step={1}
            onValueChange={handleSliderChange}
            className="my-4"
          />
        </div>

        <div className="flex space-x-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleHalf}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white border-slate-600 hover:border-slate-500"
          >
            50%
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMax}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white border-slate-600 hover:border-slate-500"
          >
            Max
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleAction}
          disabled={disabled || amount <= 0}
          className={`w-full ${
            isWithdraw
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
          }`}
        >
          {buttonText}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ActionCard;