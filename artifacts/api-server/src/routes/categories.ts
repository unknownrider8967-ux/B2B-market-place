import { Router, type IRouter, type Request, type Response } from "express";
import { db, categoriesTable } from "@workspace/db";
import { ListCategoriesResponse, CreateCategoryBody, CreateCategoryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/categories", async (_req: Request, res: Response): Promise<void> => {
  const rows = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  res.json(ListCategoriesResponse.parse(rows));
});

router.post("/categories", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db.insert(categoriesTable).values(parsed.data).returning();
  res.status(201).json(CreateCategoryResponse.parse(created));
});

export default router;
