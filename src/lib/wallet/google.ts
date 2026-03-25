import jwt from "jsonwebtoken";

type GoogleWalletConfig = {
  issuerId: string;
  serviceAccountEmail: string;
  privateKey: string;
};

function getGoogleConfig(): GoogleWalletConfig | null {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const email = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
  const keyB64 = process.env.GOOGLE_WALLET_PRIVATE_KEY;

  if (!issuerId || !email || !keyB64) {
    return null;
  }

  return {
    issuerId,
    serviceAccountEmail: email,
    privateKey: Buffer.from(keyB64, "base64").toString("utf-8"),
  };
}

type ClientData = {
  id: string;
  name: string;
  phone: string | null;
  tokens: number;
};

export function generateGoogleWalletUrl(
  client: ClientData,
  baseUrl: string,
): string | null {
  const config = getGoogleConfig();
  if (!config) return null;

  const classId = `${config.issuerId}.enviosrd-loyalty-v5`;
  const objectId = `${config.issuerId}.loyalty-v5-${client.id.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;

  const logoUrl = `${baseUrl}/brand/enviosrd-logo-square.png`;

  const payload = {
    iss: config.serviceAccountEmail,
    aud: "google",
    origins: [],
    typ: "savetowallet",
    payload: {
      genericClasses: [
        {
          id: classId,
          classTemplateInfo: {
            cardTemplateOverride: {
              cardRowTemplateInfos: [
                {
                  twoItems: {
                    startItem: {
                      firstValue: {
                        fields: [
                          {
                            fieldPath:
                              "object.textModulesData['pobox']",
                          },
                        ],
                      },
                    },
                    endItem: {
                      firstValue: {
                        fields: [
                          {
                            fieldPath:
                              "object.textModulesData['tokens']",
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      ],
      genericObjects: [
        {
          id: objectId,
          classId,
          cardTitle: {
            defaultValue: {
              language: "es",
              value: "Programa de Fidelidad",
            },
          },
          subheader: {
            defaultValue: {
              language: "es",
              value: "EnviosRD Courier",
            },
          },
          header: {
            defaultValue: {
              language: "es",
              value: client.name,
            },
          },
          logo: {
            sourceUri: {
              uri: logoUrl,
            },
          },
          hexBackgroundColor: "#002857",
          barcode: {
            type: "QR_CODE",
            value: client.id,
            alternateText: client.id,
          },
          textModulesData: [
            {
              id: "pobox",
              header: "CASILLERO",
              body: client.id,
            },
            {
              id: "tokens",
              header: "PUNTOS",
              body: `${client.tokens}/8`,
            },
          ],
        },
      ],
    },
  };

  const token = jwt.sign(payload, config.privateKey, {
    algorithm: "RS256",
  });

  return `https://pay.google.com/gp/v/save/${token}`;
}

export function isGoogleWalletConfigured(): boolean {
  return getGoogleConfig() !== null;
}

/**
 * Get an OAuth2 access token for the Google Wallet REST API
 * using the service account credentials.
 */
async function getAccessToken(config: GoogleWalletConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    {
      iss: config.serviceAccountEmail,
      scope: "https://www.googleapis.com/auth/wallet_object.issuer",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    config.privateKey,
    { algorithm: "RS256" },
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: token,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to get access token: ${res.status}`);
  }

  const data = await res.json();
  return data.access_token;
}

function buildObjectId(config: GoogleWalletConfig, clientId: string): string {
  return `${config.issuerId}.loyalty-v5-${clientId.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
}

/**
 * Update the tokens displayed on an existing Google Wallet pass.
 * Silently fails if the pass doesn't exist or wallet is not configured.
 */
export async function updateGoogleWalletTokens(
  clientId: string,
  newTokens: number,
): Promise<void> {
  const config = getGoogleConfig();
  if (!config) return;

  const objectId = buildObjectId(config, clientId);

  try {
    const accessToken = await getAccessToken(config);

    const res = await fetch(
      `https://walletobjects.googleapis.com/walletobjects/v1/genericObject/${objectId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          textModulesData: [
            {
              id: "pobox",
              header: "CASILLERO",
              body: clientId,
            },
            {
              id: "tokens",
              header: "PUNTOS",
              body: `${newTokens}/8`,
            },
          ],
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`Google Wallet PATCH failed (${res.status}):`, body);
    }
  } catch (err) {
    // Don't fail the token adjustment if the wallet update fails
    console.error("Google Wallet update error:", err);
  }
}
