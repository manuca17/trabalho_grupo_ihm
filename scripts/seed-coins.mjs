import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

async function resolveServiceAccountPath() {
  const rootEntries = await readdir(projectRoot);
  const serviceAccountFile = rootEntries.find(
    (entry) =>
      entry === "serviceAccountKey.json" || /firebase-adminsdk/i.test(entry),
  );

  if (!serviceAccountFile) {
    throw new Error(
      "Nenhum ficheiro de service account encontrado na raiz do projeto.",
    );
  }

  return path.join(projectRoot, serviceAccountFile);
}

async function loadJson(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  const content = await readFile(absolutePath, "utf8");
  return JSON.parse(content);
}

async function main() {
  const serviceAccountPath = await resolveServiceAccountPath();
  const serviceAccount = JSON.parse(await readFile(serviceAccountPath, "utf8"));
  const coins = await loadJson(
    path.join("src", "assets", "data", "coins.json"),
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const db = admin.firestore();

  for (const coin of coins) {
    const { id, ...data } = coin;

    if (!id) {
      throw new Error("Foi encontrada uma moeda sem campo id no JSON.");
    }

    await db.collection("coins").doc(id).set(data, { merge: true });
    console.log(`Criado/atualizado: coins/${id}`);
  }

  console.log(`Seed concluido. ${coins.length} moedas sincronizadas.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
