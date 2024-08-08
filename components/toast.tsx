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
      {isVisible && (
        <div
          className={`fixed bottom-4 w-11/12 sm:w-auto left-1/2 transform -translate-x-1/2 bg-[#171717] p-4 rounded-lg shadow-lg z-50 border ${borderColor} sm:max-w-sm`} // Ajustes para responsividade
          role="alert"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between">
            {" "}
            {/* Ajuste para responsividade */}
            <span className={`text-white ${textColor}`}>{message}</span>
            <div className="mt-2 sm:mt-0 ml-0 sm:ml-5">
              {" "}
              {/* Ajuste para responsividade */}
              <Button
                isIconOnly
                className="text-white"
                variant="bordered"
                onClick={onClose}
              >
                X
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Toast;
