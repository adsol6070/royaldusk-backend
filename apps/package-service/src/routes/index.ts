import { Router } from "express";
import packageRoutes from "./package.routes";
import packagePolicyRoutes from "./packagePolicy.routes";
import packageItineraryRoutes from "./packageItinerary.routes";
import packageGenericRoutes from "./genericModal.routes";
import packageEnquiryRoutes from "./packageEnquiry.routes";
import packageLocationRoutes from "./packageLocation.routes";

const router = Router();

router.use("/package", packageRoutes);
router.use("/package-policy", packagePolicyRoutes);
router.use("/package-itinerary", packageItineraryRoutes);
router.use("/package-essentials", packageGenericRoutes);
router.use("/package-enquiry", packageEnquiryRoutes);
router.use("/package-location", packageLocationRoutes);

export default router;
