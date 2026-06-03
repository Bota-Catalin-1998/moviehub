import express from "express";
import
{
    startGeneratorController,
    stopGeneratorController
}from "../controllers/generator.controller.js";

const router = express.Router();

router.post("/start",startGeneratorController);
router.post("/stop",stopGeneratorController);

export default router;