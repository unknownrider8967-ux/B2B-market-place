import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import profileRouter from "./profile";
import companiesRouter from "./companies";
import adminRouter from "./admin";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import offersRouter from "./offers";
import cartRouter from "./cart";
import ordersRouter from "./orders";
import rfqsRouter from "./rfqs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(profileRouter);
router.use(companiesRouter);
router.use(adminRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(offersRouter);
router.use(cartRouter);
router.use(ordersRouter);
router.use(rfqsRouter);

export default router;
