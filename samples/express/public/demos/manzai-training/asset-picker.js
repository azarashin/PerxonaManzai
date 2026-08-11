const THUMBNAIL_KEYS = {
  avatar: "head",
  scene: "default",
};

export function assetThumbnailUrl(asset, assetType) {
  const key = THUMBNAIL_KEYS[assetType];
  const url = key ? asset?.thumbnail_urls?.[key] : undefined;
  return typeof url === "string" && url.trim() ? url : "";
}

export function assetDisplayName(asset) {
  const name = typeof asset?.name === "string" ? asset.name.trim() : "";
  return name || asset?.id || "";
}

export function findAsset(assets, id) {
  return assets.find((asset) => asset.id === id);
}

export function filterAssets(assets, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [...assets];

  return assets.filter((asset) =>
    [assetDisplayName(asset), asset.id].some((value) =>
      normalizeSearchText(value).includes(normalizedQuery),
    ),
  );
}

function normalizeSearchText(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase();
}
