const crypto = require("crypto");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const CLOUDINARY_CLOUD = "o1nv9kjt";

const cloudinaryApiKey = defineSecret("CLOUDINARY_API_KEY");
const cloudinaryApiSecret = defineSecret("CLOUDINARY_API_SECRET");

async function destroyCloudinaryAsset(publicId, apiKey, apiSecret) {
  const timestamp = Math.round(Date.now() / 1000);
  const signature = crypto
    .createHash("sha1")
    .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature,
  });

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/destroy`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return res.json();
}

exports.deleteCloudinaryImage = onCall(
  { secrets: [cloudinaryApiKey, cloudinaryApiSecret] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "É preciso estar logado para excluir fotos.");
    }

    const publicId = typeof request.data?.publicId === "string" ? request.data.publicId.trim() : "";
    if (!publicId) {
      throw new HttpsError("invalid-argument", "publicId é obrigatório.");
    }

    const result = await destroyCloudinaryAsset(publicId, cloudinaryApiKey.value(), cloudinaryApiSecret.value());

    if (result.result !== "ok" && result.result !== "not found") {
      throw new HttpsError("internal", `Cloudinary: ${JSON.stringify(result)}`);
    }

    return { success: true, cloudinaryResult: result.result };
  }
);
