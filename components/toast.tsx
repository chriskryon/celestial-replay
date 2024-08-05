import { Button } from "@nextui-org/button";
import { useEffect } from "react";

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  color?: "success" | "danger";
}

const Toast: React.FC<ToastProps> = ({
  message,
  isVisible,
  onClose,
  color = "success",
}) => {
  const textColor = color === "success" ? "text-green-500" : "text-red-500";
  const borderColor =
    color === "success" ? "border-green-500" : "border-red-500";

  useEffect(() => {
    let timeoutId: NodeJS.Timeout; // Variável para armazenar o ID do timeout

    if (isVisible) {
      timeoutId = setTimeout(() => {
        onClose(); // Chama a função onClose após 5 segundos
      }, 5000);
    }

    return () => {
      clearTimeout(timeoutId); // Limpa o timeout se o componente for desmontado ou isVisible mudar para false
    };
  }, [isVisible, onClose]); // Executa o efeito sempre que isVisible ou onClose mudarem

  return (
    <>
      isVisible && (
      <div
        className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-[#171717] p-4 rounded-lg shadow-lg z-50 border ${borderColor}`}
        role="alert"
      >
        <div className="flex items-center justify-between">
          <span className={`text-white ${textColor}`}>{message}</span>
          <div className="ml-5">
            <Button
              isIconOnly
              className="text-white"
              variant="light"
              onClick={onClose}
            >
              X
            </Button>
          </div>
        </div>
      </div>
      )
    </>
  );
};

export default Toast;
