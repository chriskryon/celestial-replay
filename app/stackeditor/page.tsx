/* eslint-disable no-console */
"use client";
import { useEffect, useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from "@nextui-org/table";
import { Tooltip } from "@nextui-org/tooltip";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@nextui-org/dropdown";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@nextui-org/modal";
import { nanoid } from "nanoid";
import ReactPlayer from "react-player";

import fetchValidStacks from "../utils/fetchValidStacks";
import { editStack } from "../utils/editStack";
import { deleteVideoFromStack } from "../utils/deleteVideoFromStack";

import { EditIcon } from "./EditIcon";
import { DeleteIcon } from "./DeleteIcon";

function StackDetailsPage() {
  const [selectedStack, setSelectedStack] = useState<string | null>(null);
  const [urlData, setUrlData] = useState<
    { url: string; repetitions: number }[]
  >([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null); // Estado para controlar a linha em edição
  const [stacks, setStacks] =
    useState<
      { name: string; videos: { url: string; repetitions: number }[] }[]
    >(fetchValidStacks());

  // Estados para o modal de edição
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [editingUrl, setEditingUrl] = useState("");
  const [editingRepetitions, setEditingRepetitions] = useState(0);
  const [isEditingUrlValid, setIsEditingUrlValid] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isRepetitionsInvalid, setIsRepetitionsInvalid] = useState(false);
  const [deleteType, setDeleteType] = useState<"row" | "stack">("row");

  useEffect(() => {
    const isValid = ReactPlayer.canPlay(editingUrl);

    setIsEditingUrlValid(isValid);

    if (!isValid) {
      setUrlError("Unsupported URL or player."); // Define a mensagem de erro se inválido
    } else {
      setUrlError(null); // Limpa o erro se válido
    }
  }, [editingUrl]);

  useEffect(() => {
    setIsRepetitionsInvalid(editingRepetitions <= 0);
  }, [editingRepetitions]);

  // Estado para controlar o modal de exclusão
  const {
    isOpen: isDeleteModalOpen,
    onOpen: openDeleteModal,
    onOpenChange: onDeleteModalClose,
  } = useDisclosure();
  const [itemToDeleteIndex, setItemToDeleteIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (selectedStack) {
      handleLoadStack(selectedStack);
    } else {
      setUrlData([]);
    }
  }, [selectedStack]);

  const handleDeleteStack = () => {
    if (selectedStack) {
      setDeleteType("stack");
      openDeleteModal();
    }
  };

  const handleLoadStack = (stackId: string) => {
    try {
      if (typeof window !== "undefined") {
        const storedData = localStorage.getItem(stackId);

        if (storedData) {
          const parsedData = JSON.parse(storedData);

          setUrlData(parsedData);
        } else {
          setUrlData([]);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar detalhes da stack:", error);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditingUrl(urlData[index].url);
    setEditingRepetitions(urlData[index].repetitions);

    onOpen();
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && selectedStack) {
      const success = editStack(
        selectedStack,
        urlData[editingIndex].url,
        editingUrl,
        urlData[editingIndex].repetitions,
        editingRepetitions,
      );

      if (success) {
        if (success.updatedVideos) {
          console.log("Deu certo");
          setUrlData(success.updatedVideos);
        } else {
          console.log(`Deu o erro: ${success.error}`);
          // setUrlData([]);
        }
      } else {
      }

      setEditingIndex(null);
      onOpenChange();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCancelEdit = () => {
    setEditingIndex(null);
    onOpenChange();
  };

  const handleDelete = (index: number) => {
    setDeleteType("row");
    setItemToDeleteIndex(index);
    openDeleteModal();
  };

  const confirmDelete = () => {
    if (deleteType === "row") {
      if (itemToDeleteIndex !== null && selectedStack) {
        const result = deleteVideoFromStack(selectedStack, itemToDeleteIndex);

        if (result.success) {
          if (result.stackDeleted) {
            // Atualiza o estado stacks para refletir a exclusão
            const updatedStacks = stacks.filter(
              (stack) => stack.name !== selectedStack,
            );

            setStacks(updatedStacks);

            // Limpa a tabela e o selectedStack
            setUrlData([]);
            setSelectedStack(null);
            console.log("Tive que apagar a stack");
          } else {
            console.log("Exclui a linha com sucesso");
            // Atualiza o estado urlData para refletir as mudanças na tabela
            setUrlData(result.updatedData);
          }
        } else {
          // Lógica para lidar com o erro (exibir uma mensagem para o usuário)
          console.error(result.error); // Exibe o erro no console (opcional)
        }

        setItemToDeleteIndex(null);
      }
    } else if (deleteType === "stack") {
      if (selectedStack && typeof window !== "undefined") {
        localStorage.removeItem(selectedStack);

        const updatedStacks = stacks.filter(
          (stack) => stack.name !== selectedStack,
        );

        setStacks(updatedStacks);

        setUrlData([]);
        setSelectedStack(null);
        console.log("Stack excluída com sucesso!");
      }
    }
    onDeleteModalClose();
  };

  return (
    <div className="bg-[#27272A] rounded-md bg-opacity-70 p-5 flex flex-col items-center space-y-4">
      <div className="bg-[#27272A] rounded-md bg-opacity-100 p-2 flex justify-center items-center w-full max-w-xl">
        <Dropdown>
          <DropdownTrigger>
            <Button color="primary" variant="bordered">
              {selectedStack || "Select a Stack"}
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            disallowEmptySelection
            aria-label="Stack Menu"
            selectedKeys={selectedStack ? [selectedStack] : []}
            selectionMode="single"
            onSelectionChange={(keys) => {
              if (keys.currentKey) {
                const selectedStackName = keys.currentKey;

                setSelectedStack(selectedStackName);

                const selectedStack = stacks.find(
                  (stack) => stack.name === selectedStackName,
                );

                setUrlData(selectedStack?.videos || []);
              }
            }}
          >
            {stacks.map((stack) => {
              const lastDashIndex = stack.name.lastIndexOf("-");
              const displayName =
                lastDashIndex !== -1
                  ? stack.name.substring(0, lastDashIndex)
                  : stack.name;

              return (
                <DropdownItem
                  key={stack.name}
                  textValue={displayName}
                  value={stack.name}
                >
                  {displayName}
                </DropdownItem>
              );
            })}
          </DropdownMenu>
        </Dropdown>

        {selectedStack && (
          <Tooltip color="danger" content="Delete Stack">
            <Button
              className="text-lg text-red-500 border border-red-500 cursor-pointer active:opacity-50 ml-2"
              variant="light"
              onClick={handleDeleteStack}
            >
              <DeleteIcon />
            </Button>
          </Tooltip>
        )}
      </div>
      <Table aria-label="Tabela de URLs">
        <TableHeader>
          <TableColumn>URL</TableColumn>
          <TableColumn>Repetitions</TableColumn>
          <TableColumn>Actions</TableColumn>
        </TableHeader>
        <TableBody>
          {urlData.map((url, index) => {
            return (
              <TableRow key={`${selectedStack}_key=${nanoid(9)}`}>
                <TableCell>{url.url}</TableCell>
                <TableCell>{url.repetitions}</TableCell>
                <TableCell>
                  <div className="relative flex items-center gap-2">
                    <Tooltip content="Edit URL">
                      <Button
                        className="text-lg text-default-400 cursor-pointer active:opacity-50"
                        variant="light" // Or any other variant that suits your design
                        onClick={() => handleEdit(index)}
                      >
                        <EditIcon />
                      </Button>
                    </Tooltip>
                    <Tooltip color="danger" content="Delete URL">
                      <Button
                        className="text-lg text-red-500 cursor-pointer active:opacity-50"
                        variant="light"
                        onClick={() => handleDelete(index)}
                      >
                        <DeleteIcon />
                      </Button>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Editar Vídeo</ModalHeader>
              <ModalBody>
                <Input
                  color={isEditingUrlValid ? "success" : "danger"}
                  errorMessage={urlError}
                  isInvalid={!isEditingUrlValid}
                  label="URL"
                  type="text"
                  value={editingUrl}
                  onChange={(e) => setEditingUrl(e.target.value)}
                />
                <Input
                  fullWidth
                  className="w-full max-w-xl"
                  color={isRepetitionsInvalid ? "danger" : "success"}
                  errorMessage={
                    isRepetitionsInvalid
                      ? "Invalid input. Enter a positive number."
                      : undefined
                  }
                  isInvalid={isRepetitionsInvalid}
                  label="Number of repetitions"
                  type="number"
                  value={editingRepetitions.toString()}
                  onChange={(e) =>
                    setEditingRepetitions(parseInt(e.target.value, 10))
                  }
                />
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color={
                    isEditingUrlValid && isRepetitionsInvalid
                      ? "success"
                      : "danger"
                  }
                  disabled={!isEditingUrlValid}
                  onPress={handleSaveEdit}
                >
                  {" "}
                  {isEditingUrlValid && isRepetitionsInvalid
                    ? "Save"
                    : "Waiting for valid input"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onOpenChange={onDeleteModalClose}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                Delete {deleteType == "row" ? "Row" : "Stack"}
              </ModalHeader>
              <ModalBody>
                <p>
                  Are you sure to delete this{" "}
                  {deleteType == "row"
                    ? "row"
                    : `stack named ${selectedStack}?`}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="danger" onPress={confirmDelete}>
                  Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

export default StackDetailsPage;
