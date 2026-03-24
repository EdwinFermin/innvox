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
  logoUrl: string,
): string | null {
  const config = getGoogleConfig();
  if (!config) return null;

  const classId = `${config.issuerId}.enviosrd-loyalty-v2`;
  const objectId = `${config.issuerId}.loyalty-v2-${client.id.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;

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
          hexBackgroundColor: "#002c5a",
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
              header: "TOKENS",
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
