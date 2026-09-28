import { hash } from "bcryptjs";
import { stdin, stdout } from "node:process";

function readHidden(prompt: string): Promise<string> {
  if (!stdin.isTTY || !stdin.setRawMode) {
    throw new Error("Execute este comando em um terminal interativo.");
  }

  return new Promise((resolve, reject) => {
    let value = "";
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const finish = (error?: Error) => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };

    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          finish(new Error("Operação cancelada."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          const chars = Array.from(value);
          if (chars.length > 0) {
            chars.pop();
            value = chars.join("");
            stdout.write("\b \b");
          }
          continue;
        }
        if (character >= " ") {
          value += character;
          stdout.write("•");
        }
      }
    };

    stdin.on("data", onData);
  });
}

const password = await readHidden("Nova senha: ");
const confirmation = await readHidden("Repita a senha: ");

if (password.length < 12) {
  console.error("A senha precisa ter pelo menos 12 caracteres.");
  process.exit(1);
}
if (password !== confirmation) {
  console.error("As senhas não conferem.");
  process.exit(1);
}

console.log(await hash(password, 12));