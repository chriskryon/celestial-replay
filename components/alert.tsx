import { FC } from "react";

interface AlertProps {
  message: string; // Define the interface for props
}

const Alert: FC<AlertProps> = ({ message }) => {
  return (
    <div
      className="p-4 mb-4 text-sm rounded-lg text-red-400 border border-red-400"
      role="alert"
    >
      <span className="font-medium">{message}</span>
    </div>
  );
};

export default Alert;
