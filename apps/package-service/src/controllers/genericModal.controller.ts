import { Request, Response } from "express";
import { asyncHandler } from "@repo/utils/asyncHandler";
import { CategoryService, FeatureService, ServiceService } from "../services/genericModal.service"; 

interface GenericControllerOptions<TService> {
  service: TService;
  entityName: string;
}

function createGenericController<TService extends {
  create: (data: any) => Promise<any>;
  getById: (id: string) => Promise<any>;
  getAll: () => Promise<any[]>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}>({ service, entityName }: GenericControllerOptions<TService>) {
  return {
    create: asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const data = await service.create(req.body);
      res.status(201).json({
        success: true,
        message: `${entityName} created successfully`,
        data,
      });
    }),

    getById: asyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
      const data = await service.getById(req.params.id);
      if (!data) {
        res.status(404).json({
          success: false,
          message: `${entityName} not found`,
        });
        return;
      }
      res.status(200).json({
        success: true,
        message: `${entityName} retrieved successfully`,
        data,
      });
    }),

    getAll: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
      const data = await service.getAll();
      res.status(200).json({
        success: true,
        message: `${entityName}s retrieved successfully`,
        data,
      });
    }),

    update: asyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
      const data = await service.update(req.params.id, req.body);
      if (!data) {
        res.status(404).json({
          success: false,
          message: `${entityName} not found`,
        });
        return;
      }
      res.status(200).json({
        success: true,
        message: `${entityName} updated successfully`,
        data,
      });
    }),

    delete: asyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
      const data = await service.delete(req.params.id);
      if (!data) {
        res.status(404).json({
          success: false,
          message: `${entityName} not found`,
        });
        return;
      }
      res.status(204).send();
    }),
  };
}

// --- Specific Controllers Using Generic Controller ---

export const PackageCategoryController = createGenericController({
  service: CategoryService,
  entityName: "Package category",
});

export const PackageFeatureController = createGenericController({
  service: FeatureService,
  entityName: "Package feature",
});

export const PackageServiceController = createGenericController({
  service: ServiceService,
  entityName: "Package service",
});
