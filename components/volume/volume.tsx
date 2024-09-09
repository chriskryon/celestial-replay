import React from "react";
import { Slider } from "@nextui-org/slider";
import { Button } from "@nextui-org/button";
import { SliderValue } from "@nextui-org/slider";

import { VolumeLowIcon } from "./VolumeLowIcon";
import { VolumeHighIcon } from "./VolumeHighIcon";

interface VolumeCelestialProps {
  onVolumeChange: (value: number | number[]) => void;
}

export default function VolumeCelestial({
  onVolumeChange,
}: VolumeCelestialProps) {
  const [value, setValue] = React.useState<SliderValue>(25);

  const handleSliderChange = (newValue: SliderValue) => {
    setValue(newValue);
    onVolumeChange(newValue); // Chama a função passada como prop
  };


  return (
    <div className="flex flex-col gap-2 w-full h-full max-w-md items-start justify-center">
      <Slider
        aria-label="Volume"
        className="max-w-md"
        color="success"
        endContent={
          <Button
            isIconOnly
            radius="full"
            variant="light"
            onPress={() =>
              setValue((prev) => (Number(prev) <= 90 ? Number(prev) + 10 : 100))
            }
          >
            <VolumeHighIcon className="text-2xl" />
          </Button>
        }
        size="md"
        startContent={
          <Button
            isIconOnly
            radius="full"
            variant="light"
            onPress={() =>
              setValue((prev) => (Number(prev) >= 10 ? Number(prev) - 10 : 0))
            }
          >
            <VolumeLowIcon className="text-2xl" />
          </Button>
        }
        value={value}
        onChange={handleSliderChange}
      />
      <p className="text-default-500 font-medium text-small">
        Current volume: {value}
      </p>
    </div>
  );
}
