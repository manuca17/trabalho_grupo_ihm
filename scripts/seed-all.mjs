import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const SEEDED_USERS = [
  {
    key: "manuel",
    email: "manuel.ferreira@ancientcoins.app",
    password: "Ancient123!",
    displayName: "Manuel Ferreira",
    bio: "Colecionador de moeda antiga com foco em numismatica romana e portuguesa.",
    interests: ["Romanas", "Ibericas", "Medievais"],
    stats: {
      publishedOffers: 2,
      completedTrades: 1,
      favoritesCount: 5,
      rating: 4.9,
    },
  },
  {
    key: "carlos",
    email: "carlos.mendes@ancientcoins.app",
    password: "Ancient123!",
    displayName: "Carlos Mendes",
    bio: "Colecionador focado em moeda romana de prata e trocas equilibradas.",
    interests: ["Romanas", "Gregas"],
    stats: {
      publishedOffers: 1,
      completedTrades: 0,
      favoritesCount: 2,
      rating: 4.7,
    },
  },
  {
    key: "maria",
    email: "maria.costa@ancientcoins.app",
    password: "Ancient123!",
    displayName: "Maria Costa",
    bio: "Vendedora e colecionadora com interesse em peças imperiais e bronze tardio.",
    interests: ["Romanas", "Bizantinas", "Celtas"],
    stats: {
      publishedOffers: 3,
      completedTrades: 2,
      favoritesCount: 7,
      rating: 5,
    },
  },
];

const SEEDED_OFFERS = [
  {
    id: "seed-offer-aureus",
    ownerKey: "maria",
    coinId: "coin-aureus-augustus",
    quantity: 1,
    askPrice: 1900,
    description:
      "Aureus disponível para venda ou troca por peça romana em prata com excelente conservação.",
    availableForTrade: true,
    photos: [
      {
        kind: "obverse",
        label: "Anverso",
        dataUrl: "assets/icon/coin-aureus.svg",
        brightness: 0.82,
      },
      {
        kind: "reverse",
        label: "Reverso",
        dataUrl: "assets/icon/coin-aureus.svg",
        brightness: 0.79,
      },
      {
        kind: "edge",
        label: "Bordo",
        dataUrl: "assets/icon/coin-aureus.svg",
        brightness: 0.76,
      },
    ],
    status: "negotiating",
    createdAt: "2026-06-03T18:12:00.000Z",
  },
  {
    id: "seed-offer-denarius",
    ownerKey: "carlos",
    coinId: "coin-denarius-trajan",
    quantity: 1,
    askPrice: 650,
    description:
      "Denário de Trajano com relevo bem preservado. Venda direta preferida.",
    availableForTrade: false,
    photos: [
      {
        kind: "obverse",
        label: "Anverso",
        dataUrl: "assets/icon/coin-denarius.svg",
        brightness: 0.88,
      },
      {
        kind: "reverse",
        label: "Reverso",
        dataUrl: "assets/icon/coin-denarius.svg",
        brightness: 0.84,
      },
      {
        kind: "edge",
        label: "Bordo",
        dataUrl: "assets/icon/coin-denarius.svg",
        brightness: 0.8,
      },
    ],
    status: "published",
    createdAt: "2026-06-03T18:15:00.000Z",
  },
];

const APP_STRINGS_DOCUMENT_ID = "default";

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

function buildInitials(displayName) {
  return displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");
}

async function ensureAuthUser(auth, userSeed) {
  try {
    const existingUser = await auth.getUserByEmail(userSeed.email);
    await auth.updateUser(existingUser.uid, {
      displayName: userSeed.displayName,
      password: userSeed.password,
    });
    return existingUser.uid;
  } catch (error) {
    if (error?.code !== "auth/user-not-found") {
      throw error;
    }

    const createdUser = await auth.createUser({
      email: userSeed.email,
      password: userSeed.password,
      displayName: userSeed.displayName,
      emailVerified: true,
    });

    return createdUser.uid;
  }
}

async function seedUsers(db, auth) {
  const seededUserMap = new Map();

  for (const userSeed of SEEDED_USERS) {
    const uid = await ensureAuthUser(auth, userSeed);
    seededUserMap.set(userSeed.key, { uid, ...userSeed });

    await db
      .collection("users")
      .doc(uid)
      .set(
        {
          displayName: userSeed.displayName,
          email: userSeed.email,
          bio: userSeed.bio,
          interests: userSeed.interests,
          avatarInitials: buildInitials(userSeed.displayName),
          createdAt: "2026-06-03T18:10:00.000Z",
          updatedAt: "2026-06-03T18:10:00.000Z",
          stats: userSeed.stats,
        },
        { merge: true },
      );

    console.log(`Criado/atualizado: users/${uid} (${userSeed.email})`);
  }

  return seededUserMap;
}

async function seedCoins(db) {
  const coins = await loadJson(
    path.join("src", "assets", "data", "coins.json"),
  );

  for (const coin of coins) {
    const { id, ...data } = coin;
    await db.collection("coins").doc(id).set(data, { merge: true });
    console.log(`Criado/atualizado: coins/${id}`);
  }
}

async function seedAppStrings(db) {
  const appStrings = await loadJson(
    path.join("src", "assets", "data", "app-strings.json"),
  );

  await db
    .collection("app_strings")
    .doc(APP_STRINGS_DOCUMENT_ID)
    .set(appStrings, { merge: true });

  console.log(`Criado/atualizado: app_strings/${APP_STRINGS_DOCUMENT_ID}`);
}

async function seedOffers(db, seededUserMap) {
  for (const offer of SEEDED_OFFERS) {
    const owner = seededUserMap.get(offer.ownerKey);

    if (!owner) {
      throw new Error(`Utilizador seed em falta para oferta: ${offer.id}`);
    }

    const { id, ownerKey, ...data } = offer;
    await db.collection("offers").doc(id).set(data, { merge: true });
    await db
      .collection("offers")
      .doc(id)
      .set(
        {
          ...data,
          ownerId: owner.uid,
          ownerDisplayName: owner.displayName,
        },
        { merge: true },
      );
    console.log(`Criado/atualizado: offers/${id}`);
  }
}

async function seedNegotiations(db) {
  const negotiations = await loadJson(
    path.join("src", "assets", "data", "conversations.json"),
  );

  for (const negotiation of negotiations) {
    const { id, ...data } = negotiation;
    await db.collection("negotiations").doc(id).set(data, { merge: true });
    console.log(`Criado/atualizado: negotiations/${id}`);
  }
}

async function main() {
  const serviceAccountPath = await resolveServiceAccountPath();
  const serviceAccount = JSON.parse(await readFile(serviceAccountPath, "utf8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const db = admin.firestore();
  const auth = admin.auth();

  const seededUserMap = await seedUsers(db, auth);
  await seedCoins(db);
  await seedAppStrings(db);
  await seedOffers(db, seededUserMap);
  await seedNegotiations(db);

  console.log(
    "Seed completo concluido para users, coins, app_strings, offers e negotiations.",
  );
  console.log(
    "Credenciais seed: manuel.ferreira@ancientcoins.app / Ancient123!",
  );
  console.log("Credenciais seed: carlos.mendes@ancientcoins.app / Ancient123!");
  console.log("Credenciais seed: maria.costa@ancientcoins.app / Ancient123!");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
