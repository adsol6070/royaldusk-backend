import { Request, Response } from "express";
import { PackagePolicyService } from "../services/packagePolicy.service";
import { asyncHandler } from "@repo/utils/asyncHandler";

const createPolicy = async (req: Request, res: Response): Promise<void> => {
  const policy = await PackagePolicyService.createPolicy(req.body);
  res.status(201).json({
    success: true,
    message: "Package policy created successfully",
    data: policy,
  });
};

const getPolicyByID = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const policy = await PackagePolicyService.getPolicyByID(req.params.id);
  if (!policy) {
    res.status(404).json({
      success: false,
      message: "Package policy not found",
    });
    return;
  }
  res.status(200).json({
    success: true,
    message: "Package policy retrieved successfully",
    data: policy,
  });
};

const getAllPolicy = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const service = await PackagePolicyService.getAllPolicy();
  res.status(200).json({
    success: true,
    message: "Package policy retrieved successfully",
    data: service,
  });
};

const updatePolicy = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const policy = await PackagePolicyService.updatePolicy(
    req.params.id,
    req.body
  );
  if (!policy) {
    res.status(404).json({
      success: false,
      message: "Package policy not found",
    });
    return;
  }
  res.status(200).json({
    success: true,
    message: "Package policy updated successfully",
    data: policy,
  });
};

const deletePolicy = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const policy = await PackagePolicyService.deletePolicy(req.params.id);
  if (!policy) {
    res.status(404).json({
      success: false,
      message: "Package policy not found",
    });
    return;
  }
  res.status(204).send();
};

export default {
  createPolicy: asyncHandler(createPolicy),
  getPolicyByID: asyncHandler(getPolicyByID),
  getAllPolicy: asyncHandler(getAllPolicy),
  updatePolicy: asyncHandler(updatePolicy),
  deletePolicy: asyncHandler(deletePolicy),
};
