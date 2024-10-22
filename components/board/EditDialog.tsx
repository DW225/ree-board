import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import React from "react";

type EditDialogVariant = "edit";

interface EditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onContentChange: (content: string) => void;
  onSave: () => void;
  trigger: React.ReactNode;
  variant: EditDialogVariant;
}

const getVariantDisplayText = (variant: EditDialogVariant) => {
  switch (variant) {
    case "edit":
      return {
        title: "Edit Message",
        buttonText: "Save",
        placeholder: "Enter your message here...",
      };
    default:
      throw new Error("Invalid variant");
  }
};

const EditDialog: React.FC<EditDialogProps> = ({
  isOpen,
  onOpenChange,
  content,
  onContentChange,
  onSave,
  trigger,
  variant,
}) => {
  const { title, buttonText, placeholder } = getVariantDisplayText(variant);
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          className="min-h-[100px]"
          placeholder={placeholder}
        />
        <Button onClick={onSave}>{buttonText}</Button>
      </DialogContent>
    </Dialog>
  );
};

export default EditDialog;
