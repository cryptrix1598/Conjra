import { Command } from "commander";
import { registerInitCommand } from "./init.js";
import { registerAddCommand } from "./add.js";
import { registerRemoveCommand } from "./remove.js";
import { registerStatusCommand } from "./status.js";
import { registerGetTokenCommand } from "./get-token.js";
import { registerCheckCommand } from "./check.js";

const program = new Command();

program
  .name("conjra")
  .description("Provision cloud infrastructure from your editor via MCP")
  .version("1.0.0");

registerInitCommand(program);
registerAddCommand(program);
registerRemoveCommand(program);
registerStatusCommand(program);
registerGetTokenCommand(program);
registerCheckCommand(program);

program.parse();