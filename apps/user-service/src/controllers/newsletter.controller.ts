import { Request, Response } from "express";
import { asyncHandler } from "@repo/utils/asyncHandler";
import { NewsletterService } from "../services/newsletter.service";
import { ApiError } from "@repo/utils/ApiError";

// Subscribe to newsletter
const subscribe = async (req: Request, res: Response) => {
  const { email } = req.body;

  const existing = await NewsletterService.findByEmail(email);
  if (existing) {
    return res.status(200).json({
      status: "success",
      message: "Already subscribed",
    });
  }

  const newSubscriber = await NewsletterService.createSubscriber({ email });

  res.status(200).json({
    status: "success",
    message: "Subscribed successfully",
    data: { email: newSubscriber.email },
  });
};

// Update subscription status (by email)
const updateSubscription = async (req: Request, res: Response) => {
  const { email, isActive } = req.body;

  const updated = await NewsletterService.updateStatusByEmail(email, isActive);

  if (!updated) {
    throw new ApiError(404, "Subscriber not found");
  }

  res.status(200).json({
    status: "success",
    message: isActive ? "Resubscribed" : "Unsubscribed",
  });
};

// Get all (admin)
const getAll = async (req: Request, res: Response) => {
  const subscribers = await NewsletterService.getAll();

  res.status(200).json({
    status: "success",
    results: subscribers.length,
    data: subscribers,
  });
};

// Get one (admin)
const getById = async (req: Request, res: Response) => {
  const { id }: any = req.params;

  const subscriber = await NewsletterService.findById(id);
  if (!subscriber) throw new ApiError(404, "Subscriber not found");

  res.status(200).json({
    status: "success",
    data: subscriber,
  });
};

// Delete (admin)
const deleteById = async (req: Request, res: Response) => {
  const { id }: any = req.params;

  const deleted = await NewsletterService.deleteById(id);
  if (!deleted) throw new ApiError(404, "Subscriber not found or already deleted");

  res.status(200).json({
    status: "success",
    message: "Subscriber deleted",
  });
};

export default {
  subscribe: asyncHandler(subscribe),
  updateSubscription: asyncHandler(updateSubscription),
  getAll: asyncHandler(getAll),
  getById: asyncHandler(getById),
  deleteById: asyncHandler(deleteById),
};
