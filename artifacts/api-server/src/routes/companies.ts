import { Router, type IRouter, type Request, type Response } from "express";
import { GetMyCompanyResponse } from "@workspace/api-zod";
import { getOrCreateProfile, getCompanyForProfile } from "../lib/profile";

const router: IRouter = Router();

router.get("/companies/mine", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const profile = await getOrCreateProfile(req.user.id);
  // getCompanyForProfile already serializes numeric fields to numbers before returning.
  const company = await getCompanyForProfile(profile);
  res.json(GetMyCompanyResponse.parse(company));
});

export default router;
