import { PKPass } from "passkit-generator";
import path from "path";
import fs from "fs";

type ApplePassConfig = {
  passTypeIdentifier: string;
  teamIdentifier: string;
  signerCert: string | Buffer;
  signerKey: string | Buffer;
  signerKeyPassphrase?: string;
  wwdr: string | Buffer;
};

function getAppleConfig(): ApplePassConfig | null {
  const passTypeId = process.env.APPLE_PASS_TYPE_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const certB64 = process.env.APPLE_PASS_CERT;
  const keyB64 = process.env.APPLE_PASS_KEY;
  const wwdrB64 = process.env.APPLE_WWDR_CERT;

  if (!passTypeId || !teamId || !certB64 || !keyB64 || !wwdrB64) {
    return null;
  }

  return {
    passTypeIdentifier: passTypeId,
    teamIdentifier: teamId,
    signerCert: Buffer.from(certB64, "base64"),
    signerKey: Buffer.from(keyB64, "base64"),
    signerKeyPassphrase: process.env.APPLE_PASS_KEY_PASSPHRASE,
    wwdr: Buffer.from(wwdrB64, "base64"),
  };
}

function loadPassModel(): Record<string, Buffer> {
  const modelDir = path.join(
    process.cwd(),
    "src/lib/wallet/pass-model",
  );

  const files: Record<string, Buffer> = {};
  const entries = fs.readdirSync(modelDir);

  for (const entry of entries) {
    const filePath = path.join(modelDir, entry);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      files[entry] = fs.readFileSync(filePath);
    }
  }

  return files;
}

type ClientData = {
  id: string;
  name: string;
  phone: string | null;
  tokens: number;
};

export async function generateApplePass(
  client: ClientData,
): Promise<Buffer | null> {
  const config = getAppleConfig();
  if (!config) return null;

  const modelFiles = loadPassModel();

  const pass = new PKPass(
    modelFiles,
    {
      signerCert: config.signerCert,
      signerKey: config.signerKey,
      signerKeyPassphrase: config.signerKeyPassphrase,
      wwdr: config.wwdr,
    },
    {
      serialNumber: `loyalty-${client.id}`,
      description: "Tarjeta de Fidelidad EnviosRD",
      organizationName: "EnviosRD Courier",
      passTypeIdentifier: config.passTypeIdentifier,
      teamIdentifier: config.teamIdentifier,
      foregroundColor: "rgb(255, 255, 255)",
      backgroundColor: "rgb(0, 44, 90)",
      labelColor: "rgb(230, 168, 21)",
    },
  );

  pass.type = "storeCard";

  pass.setBarcodes({
    message: client.id,
    format: "PKBarcodeFormatQR",
    messageEncoding: "iso-8859-1",
    altText: client.id,
  });

  pass.headerFields.push({
    key: "tokens",
    label: "TOKENS",
    value: `${client.tokens}/8`,
  });

  pass.primaryFields.push({
    key: "name",
    label: "CLIENTE",
    value: client.name,
  });

  pass.secondaryFields.push({
    key: "pobox",
    label: "CASILLERO",
    value: client.id,
  });

  if (client.phone) {
    pass.secondaryFields.push({
      key: "phone",
      label: "TELEFONO",
      value: client.phone,
    });
  }

  pass.backFields.push(
    {
      key: "program",
      label: "PROGRAMA",
      value:
        "Acumula 8 tokens visitando nuestras sucursales. Al completar tu tarjeta recibes una recompensa.",
    },
    {
      key: "clientId",
      label: "ID DE CLIENTE",
      value: client.id,
    },
  );

  return pass.getAsBuffer();
}

export function isAppleWalletConfigured(): boolean {
  return getAppleConfig() !== null;
}
