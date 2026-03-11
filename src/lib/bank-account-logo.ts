const MAX_LOGO_SIZE = 220;
const OUTPUT_QUALITY = 0.86;

export async function uploadBankAccountLogo(_accountId: string, file: File) {
  return resizeImageToDataUrl(file);
}

export async function removeBankAccountLogo() {
  return;
}

async function resizeImageToDataUrl(file: File) {
  const image = await loadImage(file);
  const scale = Math.min(MAX_LOGO_SIZE / image.width, MAX_LOGO_SIZE / image.height, 1);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No se pudo procesar el logo.");
  }

  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/png", OUTPUT_QUALITY);
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo cargar la imagen seleccionada."));
    };

    image.src = objectUrl;
  });
}
