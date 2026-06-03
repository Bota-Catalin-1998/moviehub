import { startGenerator,stopGenerator } from "../utils/movie.generator.js";

export function startGeneratorController(req,res)
{
    startGenerator();
    res.json({message: "Generator started"});
}

export function stopGeneratorController(req,res)
{
    stopGenerator();
    res.json({message: "Generator stopped"});
}