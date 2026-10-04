import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

interface NavigationProps {
  slideIndex: number;
  totalSlides: number;
  currentClick: number;
  maxClicks: number;
  onNext: () => void;
  onPrev: () => void;
}

export function Navigation({
  slideIndex,
  totalSlides,
  currentClick,
  maxClicks,
  onNext,
  onPrev,
}: NavigationProps) {
  const progress = ((slideIndex + 1) / totalSlides) * 100;

  return (
    <div className="shrink-0">
      <Progress value={progress} className="h-[3px] rounded-none" />

      <div className="flex items-center justify-center gap-4 py-1.5 bg-background">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onPrev}
              aria-label="Previous"
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Previous</TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs tabular-nums">
            {slideIndex + 1} / {totalSlides}
          </Badge>
          {maxClicks > 0 && (
            <Badge variant="secondary" className="font-mono text-[10px] tabular-nums">
              {currentClick}/{maxClicks}
            </Badge>
          )}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onNext}
              aria-label="Next"
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Next</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
