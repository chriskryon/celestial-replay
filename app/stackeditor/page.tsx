/* eslint-disable no-console */
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
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
import ReactPlayer from "react-player";

import generateNanoid from "../utils/generateId";
import { LocalStorageAdapter } from "../domain/adapters/localStorageAdapter";
import { editStack } from "../domain/useCases/editStack";
import { deleteStack } from "../domain/useCases/deleteStack";
import { deleteVideoFromStack } from "../domain/useCases/deleteVideoFromStack";
import { Stack } from "../domain/stack";
import { listStacks } from "../domain/useCases/getAllStacks";
import { getItem } from "../domain/useCases/getItem";
import { Video } from "../domain/video";

import { DeleteIcon } from "./DeleteIcon";
import { EditIcon } from "./EditIcon";

import Toast from "@/components/toast";

function StackDetailsPage() {
  const repository = new LocalStorageAdapter();

  const newStackNameInputRef = useRef<HTMLInputElement>(null);

  const [selectedStack, setSelectedStack] = useState<string | null>(null);
  const [urlData, setUrlData] = useState<Video[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null); // Estado para controlar a linha em edição
  const [stacks, setStacks] = useState<Stack[]>([]);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [editingUrl, setEditingUrl] = useState("");
  const [editingRepetitions, setEditingRepetitions] = useState(0);
  const [isEditingUrlValid, setIsEditingUrlValid] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<"row" | "stack">("row");
  const [isEditingStackName, setIsEditingStackName] = useState(false);
  const [newStackName, setNewStackName] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastColor, setToastColor] = useState<
    "success" | "danger" | undefined
  >(undefined);

  const isRepetitionsInvalid = useMemo(() => {
    return editingRepetitions <= 0;
  }, [editingRepetitions]);

  const getDisplayName = (name: string) => {
    const lastDashIndex = name.lastIndexOf("-");
    const displayName =
      lastDashIndex !== -1 ? name.substring(0, lastDashIndex) : name;

    return displayName;
  };

  const handleCloseToast = () => {
    setShowToast(false);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setStacks(listStacks(repository));
    }
  }, []);

  useEffect(() => {
    const isValidUrl = ReactPlayer.canPlay(editingUrl);

    setIsEditingUrlValid(isValidUrl);

    if (!isValidUrl) {
      setUrlError("Unsupported URL or player.");
    } else {
      setUrlError(null);
    }
  }, [editingUrl, editingRepetitions]);

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

  const handleEditStackName = () => {
    setIsEditingStackName(true);
    setNewStackName(selectedStack || "");
    setTimeout(() => {
      newStackNameInputRef.current?.focus();
    }, 0);
  };

  const handleCancelEditStackName = () => {
    setIsEditingStackName(false);
    setNewStackName(selectedStack || "");
  };

  const handleSaveStackName = () => {
    if (
      selectedStack &&
      newStackName.trim() !== "" &&
      newStackName.trim() !== selectedStack
    ) {
      const storedData = getItem(selectedStack, repository);

      if (storedData) {
        localStorage.removeItem(selectedStack);
        const newName = `${newStackName.trim()}-${generateNanoid()}`;

        console.log(newName);

        localStorage.setItem(newName, JSON.stringify(storedData));

        setStacks(
          stacks.map((stack) =>
            stack.name === selectedStack
              ? ({ ...stack, name: newName } as Stack)
              : stack,
          ),
        );

        setSelectedStack(newName);

        setShowToast(true);
        setToastColor("danger");
        setToastMessage(
          `Stack '${getDisplayName(selectedStack)}' renamed to '${getDisplayName(newName)}'.`,
        );
      }
    } else {
      setShowToast(true);
      setToastColor("danger");
      setToastMessage("No changes were made.");
    }
    setIsEditingStackName(false);
  };

  const handleDeleteStack = () => {
    if (selectedStack) {
      setDeleteType("stack");
      openDeleteModal();
    }
  };

  const handleLoadStack = (stackId: string) => {
    try {
      if (typeof window !== "undefined") {
        console.log("carregando", stackId);
        const storedData = getItem(stackId, repository);

        console.log("deu certo", storedData);

        if (storedData) {
          const parsedData = JSON.parse(
            JSON.stringify(storedData.videos),
          ) as Video[];

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

    setIsEditingUrlValid(ReactPlayer.canPlay(urlData[index].url));

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
        repository,
      );

      if (success) {
        if (success.updatedVideos) {
          setUrlData(success.updatedVideos);
          setShowToast(true);
          setToastColor("success");
          setToastMessage(
            `Stack ${getDisplayName(selectedStack)} updated successfully.`,
          );
        } else {
          console.log(`Deu o erro: ${success.error}`);
          setShowToast(true);
          setToastColor("danger");
          const errorMessage = success.error || "An error occurred.";

          setToastMessage(
            `Stack ${getDisplayName(selectedStack)} error. ${errorMessage}`,
          );
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
        const result = deleteVideoFromStack(
          selectedStack,
          itemToDeleteIndex,
          repository,
        );

        if (result.success) {
          if (result.stackDeleted) {
            const updatedStacks = stacks.filter(
              (stack) => stack.name !== selectedStack,
            );

            setStacks(updatedStacks);

            setUrlData([]);
            setSelectedStack(null);

            const message = `Stack ${getDisplayName(selectedStack)} deleted successfully, because has just one video.`;

            setToastMessage(message);
            setToastColor("success");
          } else {
            if (result.updatedData) {
              setUrlData(result.updatedData);
            }
            const message = `Line deleted successfully.`;

            setToastMessage(message);
            setToastColor("success");
          }
        } else {
          console.error(result.error);
        }

        setShowToast(true);
        setItemToDeleteIndex(null);
      }
    } else if (deleteType === "stack") {
      if (selectedStack && typeof window !== "undefined") {
        const result = deleteStack(selectedStack, repository);

        if (result.success) {
          const updatedStacks = stacks.filter(
            (stack) => stack.name !== selectedStack,
          );

          setStacks(updatedStacks);
          setUrlData([]);
          setSelectedStack(null);
          setToastMessage("Stack deleted successfully.");
          setShowToast(true);
          setToastColor("success");
        } else {
          console.error(result.error);
        }
      }
    }
    onDeleteModalClose();
  };

  return (
    <div className="bg-[#27272A] rounded-md bg-opacity-70 p-5 flex flex-col items-center space-y-4">
      {showToast && (
        <Toast
          color={toastColor}
          isVisible={showToast}
          message={toastMessage}
          onClose={handleCloseToast}
        />
      )}
      <div className="bg-[#27272A] rounded-md bg-opacity-100 p-2 flex flex-col space-y-4 w-full">
        <div className="flex items-center justify-between">
          <Dropdown onOpenChange={setIsDropdownOpen}>
            <DropdownTrigger>
              <Button
                className="w-full mr-3"
                color="primary"
                variant="bordered"
              >
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

                  const selectedStackData = stacks.find(
                    (stack) => stack.name === selectedStackName,
                  );

                  setUrlData(selectedStackData?.videos || []);

                  setIsEditingStackName(false);
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

          {/* Dropdown secundário para ações de edição e exclusão */}
          {selectedStack && !isEditingStackName && (
            <div className="flex items-center">
              <Tooltip color="primary" content="Edit Stack Name">
                <Button
                  className="text-lg text-default-400 cursor-pointer active:opacity-50"
                  variant="bordered"
                  onClick={handleEditStackName}
                >
                  <EditIcon />
                </Button>
              </Tooltip>
              <Tooltip color="danger" content="Delete Stack">
                <Button
                  className="text-lg text-red-500 cursor-pointer active:opacity-50 ml-2"
                  variant="bordered"
                  onClick={handleDeleteStack}
                >
                  <DeleteIcon />
                </Button>
              </Tooltip>
            </div>
          )}
        </div>

        {selectedStack && isEditingStackName && (
          <div className="flex items-center mt-2">
            <Input
              ref={newStackNameInputRef}
              className="mr-2"
              labelPlacement="inside"
              placeholder="New Stack Name"
              type="text"
              value={newStackName}
              variant="bordered"
              onChange={(e) => setNewStackName(e.target.value)}
            />
            <div className="flex">
              <Button color="success" onClick={handleSaveStackName}>
                Save
              </Button>
              <Button
                className="ml-2"
                color="default"
                variant="ghost"
                onClick={handleCancelEditStackName}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      <div
        className={`fixed inset-0 z-10 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isDropdownOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      <Table aria-label="Tabela de URLs">
        <TableHeader>
          <TableColumn>URL</TableColumn>
          <TableColumn>Repetitions</TableColumn>
          <TableColumn>Actions</TableColumn>
        </TableHeader>
        <TableBody>
          {urlData.map((url, index) => {
            return (
              <TableRow key={`${selectedStack}_key=${generateNanoid()}`}>
                <TableCell>{url.url}</TableCell>
                <TableCell>{url.repetitions}</TableCell>
                <TableCell>
                  <div className="relative flex items-center gap-2">
                    <Tooltip content="Edit URL">
                      <Button
                        className="text-lg text-default-400 cursor-pointer active:opacity-50"
                        variant="light"
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
                    isEditingUrlValid && !isRepetitionsInvalid
                      ? "success"
                      : "danger"
                  }
                  isDisabled={!isEditingUrlValid || isRepetitionsInvalid}
                  onPress={handleSaveEdit}
                >
                  {!isEditingUrlValid || isRepetitionsInvalid}
                  {isEditingUrlValid && !isRepetitionsInvalid
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
                    ? "row?"
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
