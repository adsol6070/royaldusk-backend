import { Request, Response } from "express";
import { asyncHandler } from "@repo/utils/asyncHandler";
import { ContactService } from "../services/contact.service";
import { ApiError } from "@repo/utils/ApiError";

const submit = async (req: Request, res: Response) => {
  const message = await ContactService.create(req.body);
  res.status(201).json({ status: "success", message: "Message sent", data: message });
};

const getAll = async (_req: Request, res: Response) => {
  const messages = await ContactService.getAll();
  res.status(200).json({ status: "success", results: messages.length, data: messages });
};

const getById = async (req: Request, res: Response) => {
  const { id }: any = req.params; 
  const message = await ContactService.getById(id);
  if (!message) throw new ApiError(404, "Message not found");
  res.status(200).json({ status: "success", data: message });
};

const deleteById = async (req: Request, res: Response) => {
  const { id }: any = req.params; 
  const deleted = await ContactService.deleteById(id);
  if (!deleted) throw new ApiError(404, "Message not found or already deleted");
  res.status(200).json({ status: "success", message: "Message deleted" });
};

export default {
  submit: asyncHandler(submit),
  getAll: asyncHandler(getAll),
  getById: asyncHandler(getById),
  deleteById: asyncHandler(deleteById),
};
