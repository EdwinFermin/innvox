import { PKPass } from "passkit-generator";
import crypto from "crypto";
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

/**
 * Generate a deterministic authentication token for a client's pass.
 * Used by Apple Wallet web service to verify requests.
 */
export function generateAuthToken(clientId: string): string {
  const secret = process.env.AUTH_SECRET || "enviosrd-loyalty";
  return crypto
    .createHmac("sha256", secret)
    .update(`apple-pass-${clientId}`)
    .digest("hex");
}

/**
 * Extract client ID from a serial number (format: "loyalty-{clientId}")
 */
export function clientIdFromSerial(serialNumber: string): string {
  return serialNumber.replace(/^loyalty-/, "");
}

export async function generateApplePass(
  client: ClientData,
  baseUrl: string,
): Promise<Buffer | null> {
  const config = getAppleConfig();
  if (!config) return null;

  const modelFiles = loadPassModel();
  const authToken = generateAuthToken(client.id);

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
      backgroundColor: "rgb(0, 40, 87)",
      labelColor: "rgb(212, 160, 23)",
      authenticationToken: authToken,
      webServiceURL: `${baseUrl}/api/wallet/apple/v1`,
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
    label: "PUNTOS",
    value: `${client.tokens}/10`,
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
      label: "TELÉFONO",
      value: client.phone,
    });
  }

  pass.backFields.push(
    {
      key: "program",
      label: "PROGRAMA",
      value:
        "Acumula 10 tokens visitando nuestras sucursales. Al completar tu tarjeta recibes una recompensa.",
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

export function getApplePassTypeId(): string | null {
  return process.env.APPLE_PASS_TYPE_ID ?? null;
}

/**
 * Send a push notification to Apple's APNs to trigger a pass update.
 * Uses certificate-based authentication (the same pass signing cert).
 */
export async function sendApplePassUpdateNotification(
  pushToken: string,
): Promise<void> {
  const config = getAppleConfig();
  if (!config) return;

  // APNs requires the pass certificate for push notifications
  // Use HTTP/2 to APNs — Node's fetch doesn't support HTTP/2,
  // so we use the http2 module directly
  const http2 = await import("http2");

  return new Promise((resolve, reject) => {
    const client = http2.connect("https://api.push.apple.com", {
      cert: config.signerCert,
      key: config.signerKey,
      passphrase:
        config.signerKeyPassphrase !== undefined
          ? config.signerKeyPassphrase
          : undefined,
    });

    client.on("error", (err) => {
      console.error("APNs connection error:", err);
      client.close();
      reject(err);
    });

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${pushToken}`,
      "apns-topic": config.passTypeIdentifier,
      "apns-push-type": "background",
      "apns-priority": "10",
    });

    req.setEncoding("utf8");

    // Empty body — APNs just needs the push to trigger a callback
    req.write(JSON.stringify({}));
    req.end();

    req.on("response", (headers) => {
      const status = headers[":status"];
      if (status === 200) {
        resolve();
      } else {
        console.error(`APNs push failed with status ${status}`);
        resolve(); // Don't fail the main operation
      }
      client.close();
    });

    req.on("error", (err) => {
      console.error("APNs request error:", err);
      client.close();
      resolve(); // Don't fail the main operation
    });
  });
}
