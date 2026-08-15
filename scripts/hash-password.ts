import { hash } from "bcryptjs";
const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Uso: npm run auth:hash -- "uma-senha-com-12+-caracteres"');
  process.exit(1);
}
console.log(await hash(password, 12));
